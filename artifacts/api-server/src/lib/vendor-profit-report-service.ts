import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { vendorSubmissionsTable, groupBuyRefundsTable, vendorAuditTable } from "@workspace/db";
import { aggregateProfitReport, londonReportRange } from "./vendor-profit-report";
import { preloadVendorSources } from "./vendor-source-reads";
import { inspectVendorSubmission } from "./vendor-portal-service";
import { vendorProductProfit } from "./vendor-payment-profit";
import { buildProductRefundReview, productRefundState, refundOrderSales, PRODUCT_REFUND_REVIEW } from "./vendor-profit-refunds";
import { previewFingerprint, VendorPortalError } from "./vendor-portal-model";

async function refundReviews(tx: any) {
  // Append-only financial review events. Never rewrite submissions or receipts.
  return tx.select().from(vendorAuditTable).where(eq(vendorAuditTable.action, PRODUCT_REFUND_REVIEW));
}
/** No wallets or receipts are joined: each supplier submission contributes once. */
export async function vendorProfitReport(tx: any, vendorId: string | undefined, from: string, to: string) {
  const range = londonReportRange(from, to);
  const rows = await tx.select().from(vendorSubmissionsTable).where(and(
    gte(vendorSubmissionsTable.submittedAt, range.start), lt(vendorSubmissionsTable.submittedAt, range.end),
    vendorId ? eq(vendorSubmissionsTable.vendorId, vendorId) : undefined,
  ));
  const reads = await preloadVendorSources(tx, rows);
  const ids = [...new Set<string>(rows.flatMap((row: any) => row.orderIds ?? []))];
  const refunds: any[] = ids.length ? await tx.select()
    .from(groupBuyRefundsTable).where(inArray(groupBuyRefundsTable.orderId, ids)) : [];
  const reviews = refunds.length ? await refundReviews(tx) : [];
  const orders = [];
  const adjustments = [];
  for (const row of rows) {
    const sourceOrders = row.orderIds.map((id: string) => reads.orders.get(id)).filter(Boolean);
    const cancelled = sourceOrders.some((order: any) => order.deletedAt || (["Cancelled", "Canceled"].includes(order.status)
      && !refunds.some(r => r.orderId === order.id && r.status === "completed")));
    const refundAdjustment = productRefundState(row, refunds, reviews,
      sourceOrders.filter((order: any) => order.paymentStatus === "refunded").map((order: any) => order.id));
    const inspection = await inspectVendorSubmission(tx, row, reads);
    orders.push({ ...row, status: cancelled ? "Cancelled" : row.status, refundAffected: refundAdjustment.affected, refundAdjustment,
      profit: vendorProductProfit(row, inspection.source, inspection.stale) });
    if (refundAdjustment.affected) adjustments.push({ submissionId: row.id, reference: row.reference,
      vendorId: row.vendorId, ...refundAdjustment });
  }
  return { ...aggregateProfitReport(orders, from, to), adjustments,
    refundReviews: refunds.filter(r => r.status === "completed" && !reviews.some((e: any) => e.details.refundId === r.id))
      .map(r => ({ refundId: r.id, orderId: r.orderId, amountUsd: r.amountUsd })) };
}

/** Review every supplier linked to an order, never just the currently filtered vendor/date. */
async function loadRefundReview(tx: any, refundId: string, lock: boolean) {
  let query = tx.select().from(groupBuyRefundsTable).where(eq(groupBuyRefundsTable.id, refundId));
  if (lock) query = query.for("update");
  const [refund] = await query;
  if (!refund) throw new VendorPortalError("Refund not found.", 404);
  let submissions = tx.select().from(vendorSubmissionsTable)
    .where(sql`${vendorSubmissionsTable.orderIds} @> ${JSON.stringify([refund.orderId])}::jsonb`);
  if (lock) submissions = submissions.for("update");
  const rows = await submissions;
  const events = await refundReviews(tx);
  return { refund, rows, events };
}

export async function productRefundReviewOptions(tx: any, refundId: string) {
  const { refund, rows, events } = await loadRefundReview(tx, refundId, false);
  if (refund.status !== "completed") throw new VendorPortalError("Only completed refunds can be reviewed.", 409);
  return { refundId, orderId: refund.orderId, amountUsd: refund.amountUsd,
    reviewed: events.some((e: any) => e.details.refundId === refundId),
    submissions: rows.filter((r: any) => !["Recalled", "Cancelled", "Canceled"].includes(r.status)).map((r: any) => {
      let lines: any[] = [], reason = null;
      try { lines = refundOrderSales(r).filter(line => line.orderId === refund.orderId); }
      catch (error) { reason = error instanceof Error ? error.message : "Historical attribution unavailable."; }
      return { id: r.id, vendorId: r.vendorId, reference: r.reference, lines, reason };
    }) };
}

/** Preview + confirm are bound to exactly the reviewed refund, allocations and commercial evidence. */
export async function reviewProductRefund(tx: any, refundId: string, input: any, actor: string) {
  if (!actor) throw new VendorPortalError("Administrator identity required.", 403);
  // Across vendors and shared members: two simultaneous reviews must not spend
  // the same frozen product quantity/sales capacity twice.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('vendor-product-refund-reviews'))`);
  const { refund, rows, events } = await loadRefundReview(tx, refundId, true);
  const review = buildProductRefundReview(refund, rows, events, input);
  const reviewToken = previewFingerprint({ review, previous: events.map((e: any) => e.id).sort() });
  if (input.reviewToken === undefined) return { review, reviewToken };
  if (input.reviewToken !== reviewToken) throw new VendorPortalError("Refund or supplier evidence changed. Preview and review again.", 409);
  const id = randomUUID();
  await tx.insert(vendorAuditTable).values({ id, actor, action: PRODUCT_REFUND_REVIEW, details: review });
  return { ok: true, id };
}
