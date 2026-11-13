import { db, wholesaleAccessRequestsTable, siteConfigTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { accessFeeReview, parseAccessFee } from "./wholesale-access-fee-policy";

type Database = Pick<typeof db, "select">;
export const ACCESS_REQUEST_CHANGED = "This access request has changed. Refresh the page before continuing.";

export class AccessFeeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function currentWholesaleAccessFee(database: Database = db) {
  const [row] = await database.select({ value: siteConfigTable.value }).from(siteConfigTable)
    .where(eq(siteConfigTable.key, "wholesale_access_amount"));
  return parseAccessFee(row?.value);
}

export function accessPaymentPaths(action: string) {
  return [
    `/account/wholesale-access/${action}`,
    `/account/wholesale-access/requests/:accessRequestId/${action}`,
  ];
}

/** Bind once, so an old tab can never submit a transaction against a replacement. */
export async function bindWholesaleAccessRequest(req: any, res: any, next: any) {
  try {
    res.setHeader("Cache-Control", "private, no-store");
    const username = req.account.telegramUsername;
    const requestedId = req.params.accessRequestId;
    if (requestedId && (!/^[1-9]\d*$/.test(requestedId) || !Number.isSafeInteger(Number(requestedId)))) {
      res.status(400).json({ error: "Invalid access request." }); return;
    }
    const [request] = await db.select().from(wholesaleAccessRequestsTable).where(and(
      eq(wholesaleAccessRequestsTable.accountUsername, username),
      eq(wholesaleAccessRequestsTable.status, "pending"),
      ...(requestedId ? [eq(wholesaleAccessRequestsTable.id, Number(requestedId))] : []),
    )).orderBy(desc(wholesaleAccessRequestsTable.createdAt), desc(wholesaleAccessRequestsTable.id)).limit(1);
    if (!request) {
      res.status(409).json({ error: ACCESS_REQUEST_CHANGED }); return;
    }
    // Check history AFTER binding the row: a concurrent replacement either
    // invalidates this bound ID or is visible here. Never pick the new row
    // after checking history, which would let an old tab target a new quote.
    if (!requestedId) {
      const [replaced] = await db.select({ id: wholesaleAccessRequestsTable.id })
        .from(wholesaleAccessRequestsTable).where(and(
          eq(wholesaleAccessRequestsTable.accountUsername, username),
          eq(wholesaleAccessRequestsTable.status, "replaced"),
        )).limit(1);
      if (replaced) {
        res.status(409).json({ error: ACCESS_REQUEST_CHANGED }); return;
      }
    }
    const action = req.path.split("/").pop();
    if (["lock-usdt-rate", "generate-test", "payments-info"].includes(action)) {
      const fee = await currentWholesaleAccessFee();
      if (accessFeeReview(request, fee).canReplace) {
        res.status(409).json({
          error: "This request has an outdated higher fee. Refresh Wholesale Access and replace the untouched request before paying.",
          code: "outdated_access_fee", accessFee: fee,
        }); return;
      }
    }
    req.wholesaleAccessRequest = request;
    next();
  } catch (error) { next(error); }
}

export async function replaceUntouchedAccessRequest(
  username: string, requestId: number, expectedFee: number, confirmsNoPayment: boolean,
) {
  if (confirmsNoPayment !== true) throw new AccessFeeError(400, "Confirm that you have not sent any payment for this request.");
  return db.transaction(async tx => {
    const [request] = await tx.select().from(wholesaleAccessRequestsTable)
      .where(eq(wholesaleAccessRequestsTable.accountUsername, username))
      .orderBy(desc(wholesaleAccessRequestsTable.createdAt), desc(wholesaleAccessRequestsTable.id))
      .limit(1).for("update");
    if (!request || request.id !== requestId || request.status !== "pending") {
      throw new AccessFeeError(409, ACCESS_REQUEST_CHANGED);
    }
    const [config] = await tx.select({ value: siteConfigTable.value }).from(siteConfigTable)
      .where(eq(siteConfigTable.key, "wholesale_access_amount")).for("share");
    const fee = parseAccessFee(config?.value);
    if (fee === null) throw new AccessFeeError(503, "Wholesale access pricing is unavailable. Please contact support.");
    if (fee !== expectedFee) throw new AccessFeeError(409, "The current access fee has changed. Refresh and review it again.");
    if (!accessFeeReview(request, fee).canReplace) {
      throw new AccessFeeError(409, "This request cannot be replaced. Payment instructions or transactions may already exist; contact support before sending more funds.");
    }
    const [created] = await tx.insert(wholesaleAccessRequestsTable).values({
      accountUsername: username, amountUsd: fee, status: "pending",
      paymentTestAmount: Math.min(randomInt(100, 200) / 100, fee / 2),
    }).returning();
    // Retain the original quote and its history. No balance or receipt changes.
    await tx.update(wholesaleAccessRequestsTable).set({
      status: "replaced",
      rejectionReason: `Replaced by request #${created.id} at the current $${fee} fee. Member confirmed no payment sent.`,
    }).where(eq(wholesaleAccessRequestsTable.id, request.id));
    return { request: created, accessFee: fee, feeReview: accessFeeReview(created, fee) };
  });
}
