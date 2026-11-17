import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, vendorSubmissionsTable, ordersTable } from "@workspace/db";
import { auditVendor, prepareVendorShipments } from "./vendor-portal-service";
import { assertVendorSubmissionUnpaid } from "./vendor-payments";
import { paymentOrderDetail, paymentReviewToken, supplierCostsValid } from "./vendor-payment-ledger";
import { supplierItems, VendorPortalError } from "./vendor-portal-model";
import { centsToUsdString, usdToCents } from "./refund-money";
import { vendorSupplierText } from "./vendor-supplier-export";
import { getVendors } from "../routes/config";

function noteInput(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 2000)
    throw new VendorPortalError("Enter an audit note (maximum 2,000 characters).");
  return value.trim();
}
function vendorInput(body: any) {
  if (typeof body?.vendorId !== "string" || !body.vendorId.trim())
    throw new VendorPortalError("Choose a vendor.");
  return body.vendorId;
}
function reviewed(row: any, vendorId: string, token: unknown) {
  if (!row || row.vendorId !== vendorId) throw new VendorPortalError("Order not found for this vendor.", 409);
  if (typeof token !== "string" || token !== paymentReviewToken(row))
    throw new VendorPortalError("Supplier order changed. Refresh and review it again.", 409);
}
function amount(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(value))
    throw new VendorPortalError("Supplier costs must be non-negative USD amounts with up to two decimal places.");
  return centsToUsdString(usdToCents(value));
}

/** Edits this supplier shipment only; customer prices and saved catalogue costs stay untouched. */
export async function editSupplierCosts(id: string, body: any, actor: string, database: any = db) {
  const vendorId = vendorInput(body), note = noteInput(body.note);
  if (body.shippingOnly !== undefined && typeof body.shippingOnly !== "boolean")
    throw new VendorPortalError("Invalid shipping-only correction.");
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 2000)
    throw new VendorPortalError("Provide a unit cost for every supplier item.");
  const shippingCost = amount(body.shippingCost);
  return database.transaction(async (tx: any) => {
    const [row] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, id)).for("update");
    reviewed(row, vendorId, body.reviewToken);
    await assertVendorSubmissionUnpaid(tx, id);
    if (["Recalled", "Cancelled", "Canceled"].includes(row.status)) throw new VendorPortalError("This supplier order is cancelled.", 409);
    const original = row.snapshot.items;
    if (body.items.length !== original.length || new Set(body.items.map((i: any) => i?.productName)).size !== original.length
      || body.items.some((i: any) => !original.some((o: any) => o.productName === i?.productName)))
      throw new VendorPortalError("Supplier items changed. Reopen the cost editor.");
    if (body.shippingOnly && body.items.some((item: any) => {
      const saved = original.find((line: any) => line.productName === item.productName);
      return saved.unitCost == null || amount(item.unitCost) !== amount(saved.unitCost);
    })) throw new VendorPortalError("A shipping-only correction cannot change product costs.");
    const items = body.shippingOnly ? original
      : supplierItems(original, body.items.map((i: any) => ({ productName: i.productName, unitCost: amount(i.unitCost) })));
    const productCents = body.shippingOnly ? usdToCents(row.snapshot.productCost)
      : items.reduce((sum: bigint, i: any) => sum + usdToCents(i.lineTotal), 0n);
    const snapshot = { ...row.snapshot, items, shippingCost, productCost: centsToUsdString(productCents),
      totalCost: centsToUsdString(productCents + usdToCents(shippingCost)) };
    if (!body.shippingOnly) delete snapshot.productCostHistoryMissing;
    await auditVendor(tx, actor, "supplier_costs_edited", id, { vendorId, note, before: row.snapshot, after: snapshot });
    await tx.update(vendorSubmissionsTable).set({ snapshot, updatedAt: new Date() }).where(eq(vendorSubmissionsTable.id, id));
    return { ok: true };
  });
}

/** Historical acknowledgement, not a transfer or a fabricated blockchain receipt. */
export async function acknowledgeSupplierPaid(body: any, actor: string, database: any = db) {
  const vendorId = vendorInput(body), note = noteInput(body.note);
  const expected = body.orderSnapshots;
  if (!Array.isArray(expected) || !expected.length || expected.length > 200
    || expected.some((o: any) => typeof o?.submissionId !== "string" || !o.submissionId)
    || new Set(expected.map((o: any) => o.submissionId)).size !== expected.length)
    throw new VendorPortalError("Review between 1 and 200 distinct supplier orders.");
  return database.transaction(async (tx: any) => {
    // Same lock as transfer receipts; all selected rows succeed or none do.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-payments:${vendorId}`}))`);
    const rows = await tx.select().from(vendorSubmissionsTable)
      .where(inArray(vendorSubmissionsTable.id, expected.map((o: any) => o.submissionId)))
      .orderBy(asc(vendorSubmissionsTable.id)).for("update");
    if (rows.length !== expected.length) throw new VendorPortalError("Supplier orders changed. Refresh and review again.", 409);
    for (const row of rows) {
      reviewed(row, vendorId, expected.find((o: any) => o.submissionId === row.id)?.reviewToken);
      await assertVendorSubmissionUnpaid(tx, row.id);
      if (["Recalled", "Cancelled", "Canceled"].includes(row.status))
        throw new VendorPortalError("This supplier order is cancelled.", 409);
      // The customer order may have progressed while vendor fulfilment still says Submitted.
      // Lock and recheck live originals at confirmation, not just the list's displayed state.
      const originals = row.orderIds?.length ? await tx.select({ id: ordersTable.id, status: ordersTable.status })
        .from(ordersTable).where(inArray(ordersTable.id, row.orderIds)).orderBy(asc(ordersTable.id)).for("update") : [];
      const processed = new Set(["processing", "processed", "shipped", "completed"]);
      if (![row.status, ...originals.map((order: any) => order.status)]
        .some(status => typeof status === "string" && processed.has(status.trim().toLowerCase())))
        throw new VendorPortalError("Only existing Processing, Shipped or Completed original orders or supplier submissions can be acknowledged here.", 409);
      const detail = paymentOrderDetail(row);
      if (!supplierCostsValid(detail)) throw new VendorPortalError("Review missing or inconsistent supplier costs first.", 409);
      const paymentAcknowledgement = { amountUsd: detail.totalCost!, note, recordedAt: new Date().toISOString(), recordedBy: actor };
      await tx.update(vendorSubmissionsTable).set({ snapshot: { ...row.snapshot, paymentAcknowledgement }, updatedAt: new Date() })
        .where(eq(vendorSubmissionsTable.id, row.id));
      await auditVendor(tx, actor, "supplier_paid_acknowledged", row.id, { vendorId, ...paymentAcknowledgement, detail });
    }
    return { ok: true, count: rows.length };
  });
}

export async function clearSupplierPaid(id: string, body: any, actor: string, database: any = db) {
  const vendorId = vendorInput(body), note = noteInput(body.note);
  return database.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-payments:${vendorId}`}))`);
    const [row] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, id)).for("update");
    reviewed(row, vendorId, body.reviewToken);
    if (!row.snapshot.paymentAcknowledgement) throw new VendorPortalError("This order has no historical paid confirmation.", 409);
    const { paymentAcknowledgement, ...snapshot } = row.snapshot;
    await tx.update(vendorSubmissionsTable).set({ snapshot, updatedAt: new Date() }).where(eq(vendorSubmissionsTable.id, id));
    await auditVendor(tx, actor, "supplier_paid_acknowledgement_cleared", id, { vendorId, note, previous: paymentAcknowledgement });
    return { ok: true };
  });
}

/** Reuses wholesale's FS3 formatter and read-only preparation, regardless of payment status. */
export async function exportSupplierPayments(body: any, database: any = db) {
  const vendorId = vendorInput(body);
  const vendor = (await getVendors()).find(v => v.id === vendorId);
  const ids = body.submissionIds;
  if (!vendor || !Array.isArray(ids) || !ids.length || ids.length > 200 || ids.some((id: any) => typeof id !== "string" || !id)
    || new Set(ids).size !== ids.length) throw new VendorPortalError("Select between 1 and 200 supplier orders from one vendor.");
  return database.transaction(async (tx: any) => {
    const rows = await tx.select().from(vendorSubmissionsTable).where(inArray(vendorSubmissionsTable.id, ids));
    if (rows.length !== ids.length || rows.some((r: any) => r.vendorId !== vendorId))
      throw new VendorPortalError("Selected orders must belong to this vendor.", 409);
    const ordered = ids.map((id: string) => rows.find((r: any) => r.id === id));
    const orderIds = [...new Set<string>(rows.flatMap((r: any) => r.orderIds))];
    const orders = await tx.select({ id: ordersTable.id, code: ordersTable.code }).from(ordersTable).where(inArray(ordersTable.id, orderIds));
    // One representative code per shipment: shared shipments already combine member orders.
    const codes = ordered.map((r: any) => orders.find((o: any) => r.orderIds.includes(o.id))?.code);
    if (codes.some((code: any) => !code)) throw new VendorPortalError("An original order is missing. Review the supplier submission.", 409);
    const shipments: any[] = [];
    // Existing wholesale preparation caps individual requests at 100 orders.
    for (let offset = 0; offset < codes.length; offset += 100) {
      const group = await prepareVendorShipments(tx, vendorId, codes.slice(offset, offset + 100), "export");
      for (const shipment of group) if (!shipments.some(s => s.sourceKey === shipment.sourceKey)) shipments.push(shipment);
    }
    return { filename: `wholesale-orders-${shipments.length}-${new Date().toISOString().slice(0,10)}.txt`,
      text: vendorSupplierText(shipments, vendor.name) };
  });
}
