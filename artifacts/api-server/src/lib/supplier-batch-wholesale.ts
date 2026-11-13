import { and, eq, isNull } from "drizzle-orm";
import { productsTable, gbSupplierBatchesTable, gbSupplierEventsTable } from "@workspace/db";
import { getEnabledWholesaleVendors, getVendors } from "../routes/config";
import { resolveProductVendor } from "./multi-vendor-shipping";
import { locked, state, supplierAccess } from "./supplier-batches";
import { lockHalfKitMoney } from "./half-kit-lock";
import { canonicalUsername, type UpdateActor } from "./group-buy-updates-model";
import { SupplierBatchError, fingerprint } from "./supplier-batches-model";
import { mapBatchWholesaleItems } from "./supplier-batch-wholesale-model";
import { calcTotalShipping, pickRegionForCountry } from "./wholesale-shipping";
import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";

export const batchWholesaleEventId = (id: string) => `batch-wholesale:${id}`;
export function isUtherGroup(group: { name?: string | null; manufacturer?: string | null }) {
  return /\buther\b/i.test(group.name ?? "") || /^uther$/i.test(group.manufacturer?.trim() ?? "");
}

async function existing(tx: any, batchId: string) {
  const [event] = await tx.select().from(gbSupplierEventsTable).where(eq(gbSupplierEventsTable.id, batchWholesaleEventId(batchId)));
  return event?.detail?.wholesaleOrder ?? null;
}

export async function buildBatchWholesalePreview(tx: any, group: any, batchId: string, country: string) {
  if (!isUtherGroup(group)) throw new SupplierBatchError("Wholesale conversion is available for Uther group buys only.", 400);
  const current = await state(tx, group, false);
  const batch = current.batches.find((b: any) => b.id === batchId);
  if (!batch) throw new SupplierBatchError("Batch not found.", 404);
  const linkedOrder = await existing(tx, batchId);
  if (linkedOrder) return { linkedOrder };
  if (batch.state !== "prepared") throw new SupplierBatchError("Only prepared batches not yet submitted to the supplier can be converted.");
  if (batch.exceptions.length) throw new SupplierBatchError("Resolve the batch's order/payment exceptions before converting it.");
  const [vendors, enabled] = await Promise.all([getVendors(), getEnabledWholesaleVendors()]);
  const uther = enabled.filter(v => /^uther\b/i.test(v.name.trim()) || /^uther$/i.test(v.id));
  if (uther.length !== 1) throw new SupplierBatchError("Enable one unambiguous Uther wholesale vendor before converting.", 400);
  const vendor = uther[0];
  const catalogue = (await tx.select().from(productsTable).where(and(
    eq(productsTable.active, true), eq(productsTable.wholesaleEnabled, true), isNull(productsTable.sourceGroupBuyId),
  )).for("share")).filter((p: any) => resolveProductVendor(p, vendors)?.id === vendor.id);
  // Derive quantities from the batch's allocations, never from current whole orders.
  const products = new Map<string, any>();
  for (const order of batch.snapshot.orders) for (const item of order.items) {
    const previous = products.get(item.productId);
    products.set(item.productId, { ...item, quantity: (previous?.quantity ?? 0) + Number(item.quantity) });
  }
  let lineItems;
  try { lineItems = mapBatchWholesaleItems([...products.values()], catalogue); }
  catch (error) { throw new SupplierBatchError((error as Error).message, 400); }
  if (lineItems.length > 500) throw new SupplierBatchError("This batch exceeds the wholesale checkout line limit.", 400);
  const code = normalizeToCode(country);
  const shippingCountry = code ? COUNTRY_CODE_TO_NAME[code] : country.trim();
  const region = pickRegionForCountry(vendor, shippingCountry);
  const productSubtotal = Number(lineItems.reduce((n, i) => n + i.lineTotal, 0).toFixed(2));
  const kits = lineItems.reduce((n, i) => n + i.quantity, 0);
  const vendorShipping = region ? calcTotalShipping(vendor, region.region, kits, productSubtotal) : null;
  const token = fingerprint({ batchId, snapshot: batch.snapshot, lineItems, vendorId: vendor.id, shippingCountry, vendorShipping });
  return { linkedOrder: null, reference: batch.reference, token, vendorId: vendor.id, vendorName: vendor.name,
    lineItems, kits, productSubtotal, vendorShipping, shippingCountry,
    grandTotal: vendorShipping === null ? null : Number((productSubtotal + vendorShipping).toFixed(2)),
    shippingError: vendorShipping === null ? "Choose a destination with configured Uther shipping before placing the order." : null };
}

export async function previewBatchWholesale(groupId: string, batchId: string, actor: UpdateActor, country: string) {
  return locked(groupId, actor, (tx, group) => buildBatchWholesalePreview(tx, group, batchId, country));
}

/** Called inside normal wholesale order creation, before its inserts. */
export async function lockBatchWholesaleCheckout(tx: any, input: any, username: string, items: any[], country: string, vendorId: string | null, shipping: number) {
  if (!input || typeof input.groupBuyId !== "string" || typeof input.batchId !== "string" || typeof input.token !== "string") {
    throw new SupplierBatchError("Invalid batch checkout source.", 400);
  }
  await lockHalfKitMoney(tx, input.groupBuyId);
  const group = await supplierAccess(tx, input.groupBuyId, { username, admin: false });
  if (canonicalUsername(group.organiserId) !== canonicalUsername(username)) throw new SupplierBatchError("Only the group-buy organiser can place this order.", 403);
  const preview = await buildBatchWholesalePreview(tx, group, input.batchId, country);
  if (preview.linkedOrder) {
    throw Object.assign(new SupplierBatchError("This batch already has a wholesale order. Open the linked order."), { orderId: preview.linkedOrder.id });
  }
  if (!preview.lineItems || preview.token !== input.token || preview.vendorShipping == null || preview.vendorShipping !== shipping || preview.vendorId !== vendorId
    || fingerprint(preview.lineItems.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })))
      !== fingerprint(items.map(({ productId, quantity, unitPrice }: any) => ({ productId, quantity: Number(quantity), unitPrice: Number(unitPrice) })).sort((a: any, b: any) => a.productId.localeCompare(b.productId)))) {
    throw new SupplierBatchError("The batch, prices or shipping changed. Review the batch checkout again.");
  }
}

/** Same transaction as the new order and lines: unique event ID provides durable provenance. */
export async function commitBatchWholesaleCheckout(tx: any, input: any, order: any, username: string) {
  const wholesaleOrder = { id: order.id, code: order.code, username };
  await tx.insert(gbSupplierEventsTable).values({ id: batchWholesaleEventId(input.batchId), groupBuyId: input.groupBuyId,
    kind: "wholesale_checkout", detail: { batchId: input.batchId, actor: username, wholesaleOrder } });
  await tx.update(gbSupplierBatchesTable).set({ state: "ordered", orderedAt: new Date(), orderedBy: username })
    .where(and(eq(gbSupplierBatchesTable.id, input.batchId), eq(gbSupplierBatchesTable.groupBuyId, input.groupBuyId)));
}
