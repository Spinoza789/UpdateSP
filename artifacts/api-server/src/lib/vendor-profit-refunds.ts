import { centsToUsdString, usdToCents as parseCents } from "./refund-money";
import { previewFingerprint, VendorPortalError } from "./vendor-portal-model";

export const PRODUCT_REFUND_REVIEW = "product_refund_reviewed";
const ignored = new Set(["rejected", "cancelled", "canceled"]);
const fail = (message: string): never => { throw new VendorPortalError(message, 409); };
function usdToCents(value: string) {
  try { return parseCents(value); }
  catch { return fail("Product refund money must be non-negative USD with at most two decimal places."); }
}
function quantity(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.000001)
    return fail("Refund quantity must be positive with at most two decimal places.");
  return Math.round(n * 100);
}
export function refundOrderSales(row: any): Array<{ orderId: string; productName: string; quantity: number; salesUsd: string }> {
  const frozen = row.snapshot?.productSales;
  if (!frozen?.lines) return fail("Historical product snapshot unavailable.");
  // A one-member submission is already attributed. Shared submissions require
  // member lines frozen WITH the shipment, never mutable order financials.
  if (row.orderIds.length === 1) return frozen.lines.map((line: any) => ({ ...line, orderId: row.orderIds[0] }));
  if (!Array.isArray(frozen.orderLines) || !frozen.orderLines.length)
    return fail("Historical shared-member product attribution is unavailable.");
  const grouped = new Map<string, { orderId: string; productName: string; quantity: number; salesUsd: string }>();
  for (const line of frozen.orderLines) {
    if (line.vendorId !== row.vendorId || !row.orderIds.includes(line.orderId))
      return fail("Frozen member attribution does not belong to this supplier submission.");
    const key = JSON.stringify([line.orderId, line.productName]), previous = grouped.get(key);
    grouped.set(key, { orderId: line.orderId, productName: line.productName,
      quantity: ((previous ? quantity(previous.quantity) : 0) + quantity(line.quantity)) / 100,
      salesUsd: centsToUsdString(usdToCents(previous?.salesUsd ?? "0") + usdToCents(line.salesUsd)) });
  }
  const lines = [...grouped.values()];
  const names = new Set(lines.map(line => line.productName));
  if (names.size !== frozen.lines.length || frozen.lines.some((original: any) => {
    const parts = lines.filter(line => line.productName === original.productName);
    return parts.reduce((sum, line) => sum + quantity(line.quantity), 0) !== quantity(original.quantity) ||
      parts.reduce((sum, line) => sum + usdToCents(line.salesUsd), 0n) !== usdToCents(original.salesUsd);
  })) return fail("Shared-member sales attribution no longer matches the historical supplier snapshot.");
  return lines.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** Sales evidence only: supplier-cost corrections do not rewrite customer sales. */
export function refundSalesEvidence(row: any) {
  const frozen = row.snapshot?.productSales;
  if (frozen?.currency !== "USD" || !Array.isArray(frozen.lines) || !frozen.lines.length)
    return fail("Historical product sales snapshot is unavailable; do not infer a refund from today's prices.");
  const names = new Set<string>();
  let total = 0n;
  for (const line of frozen.lines) {
    if (typeof line.productName !== "string" || !line.productName || names.has(line.productName))
      return fail("Historical product sales snapshot is inconsistent.");
    names.add(line.productName);
    quantity(line.quantity);
    total += usdToCents(line.salesUsd);
  }
  if (total !== usdToCents(frozen.salesUsd)) return fail("Historical product sales snapshot is inconsistent.");
  return previewFingerprint({ vendorId: row.vendorId, orderIds: [...row.orderIds].sort(), productSales: frozen, orderSales: refundOrderSales(row) });
}
export type ProductRefundReview = {
  refundId: string; orderId: string; amountUsd: string; completedAt: string; note: string;
  productRefundUsd: string; nonProductRefundUsd: string;
  submissions: Array<{ id: string; evidence: string; salesSnapshot: unknown; orderSales: ReturnType<typeof refundOrderSales> }>;
  allocations: Array<{ submissionId: string; vendorId: string; orderId: string; productName: string; quantity: number; salesUsd: string }>;
};
export type ProductRefundEvent = { id: string; actor: string; createdAt: string | Date; details: ProductRefundReview };

/**
 * An Admin reviews the ENTIRE refund across all linked submissions, including
 * zero allocation to an unaffected vendor. Amounts/quantities are explicit:
 * shared shipments may combine different historical customer selling prices.
 * Supplier costs remain incurred; this is not evidence of a supplier credit.
 */
export function buildProductRefundReview(refund: any, rows: any[], events: ProductRefundEvent[], input: any): ProductRefundReview {
  if (refund?.status !== "completed" || !refund.completedAt) return fail("Only completed refunds can receive a product adjustment.");
  if (events.some(e => e.details.refundId === refund.id)) return fail("This refund already has an immutable product review.");
  const note = typeof input?.note === "string" ? input.note.trim() : "";
  if (!note || note.length > 2000) return fail("Enter a product-attribution review note (maximum 2,000 characters).");
  if (!Array.isArray(input?.allocations) || input.allocations.length > 2000) return fail("Provide the reviewed product allocations.");
  const linked = rows.filter(row => row.orderIds.includes(refund.orderId) && !["Recalled", "Cancelled", "Canceled"].includes(row.status));
  if (!linked.length) return fail("No active supplier submissions are linked to this refund.");
  const submissions = linked.map(row => ({ id: row.id, evidence: refundSalesEvidence(row),
    salesSnapshot: structuredClone(row.snapshot.productSales), orderSales: refundOrderSales(row),
  })).sort((a, b) => a.id.localeCompare(b.id));
  const used = new Map<string, { quantity: number; sales: bigint }>();
  const add = (line: ProductRefundReview["allocations"][number], byOrder = false) => {
    const key = JSON.stringify([line.submissionId, line.productName, byOrder ? line.orderId : null]);
    const previous = used.get(key) ?? { quantity: 0, sales: 0n };
    used.set(key, { quantity: previous.quantity + quantity(line.quantity), sales: previous.sales + usdToCents(line.salesUsd) });
    return used.get(key)!;
  };
  // All previous allocations, not just this member/date/vendor, consume capacity.
  for (const event of events) for (const line of event.details.allocations) { add(line); add(line, true); }
  const seen = new Set<string>();
  let total = 0n;
  const allocations = input.allocations.map((line: any) => {
    const row = linked.find(row => row.id === line?.submissionId);
    const original = row?.snapshot.productSales.lines.find((p: any) => p.productName === line?.productName);
    if (!row || !original) return fail("Product allocation is not attributable to this order and supplier snapshot.");
    const key = JSON.stringify([row.id, original.productName]);
    if (seen.has(key)) return fail("Combine duplicate product allocations into one line.");
    seen.add(key);
    const sales = usdToCents(line.salesUsd);
    const allocation = { submissionId: row.id, vendorId: row.vendorId, orderId: refund.orderId,
      productName: original.productName, quantity: quantity(line.quantity) / 100, salesUsd: centsToUsdString(sales) };
    const cumulative = add(allocation);
    if (cumulative.quantity > quantity(original.quantity) || cumulative.sales > usdToCents(original.salesUsd))
      return fail("Cumulative refunded quantity or sales exceeds the original supplier product snapshot.");
    const member = refundOrderSales(row).find(line => line.orderId === refund.orderId && line.productName === original.productName);
    const memberTotal = add(allocation, true);
    if (!member || memberTotal.quantity > quantity(member.quantity) || memberTotal.sales > usdToCents(member.salesUsd))
      return fail("Refund quantity or sales exceeds this member's historical product attribution.");
    total += sales;
    return allocation;
  }).sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const amount = usdToCents(refund.amountUsd);
  if (total > amount) return fail("Product refunds cannot exceed the completed whole-order refund.");
  return { refundId: refund.id, orderId: refund.orderId, amountUsd: centsToUsdString(amount),
    completedAt: new Date(refund.completedAt).toISOString(), note, submissions, allocations,
    productRefundUsd: centsToUsdString(total), nonProductRefundUsd: centsToUsdString(amount - total) };
}

export function productRefundState(row: any, refunds: any[], events: ProductRefundEvent[], paymentRefunded: boolean | string[]) {
  const relevant = refunds.filter(r => row.orderIds.includes(r.orderId) && !ignored.has(r.status));
  const refundedIds = Array.isArray(paymentRefunded) ? paymentRefunded : paymentRefunded ? row.orderIds : [];
  const result = { affected: relevant.length > 0 || refundedIds.length > 0, salesUsd: "0.00", reason: null as string | null,
    reviews: [] as Array<{ refundId: string; reviewedBy: string; reviewedAt: string | Date; productRefundUsd: string; note: string }> };
  if (!result.affected) return result;
  const unavailable = (reason: string) => ({ ...result, reason });
  if (refundedIds.some((id: string) => !relevant.some(r => r.orderId === id && r.status === "completed")))
    return unavailable("Refunded payment has no completed refund evidence; product adjustment unavailable.");
  if (relevant.some(r => r.status !== "completed"))
    return unavailable("Active or unresolved refund request; excluded until completion and product review.");
  let total = 0n;
  try {
    const evidence = refundSalesEvidence(row);
    for (const refund of relevant) {
      const matches = events.filter(e => e.details.refundId === refund.id);
      if (matches.length !== 1) return unavailable("Completed refund needs an attributable product-only review.");
      const event = matches[0], review = event.details;
      if (!event.actor || !event.createdAt || review.orderId !== refund.orderId ||
        review.amountUsd !== centsToUsdString(usdToCents(refund.amountUsd)) ||
        review.completedAt !== new Date(refund.completedAt).toISOString() ||
        review.submissions.find(s => s.id === row.id)?.evidence !== evidence)
        return unavailable("Product refund review snapshot changed; adjustment unavailable.");
      const amount = review.allocations.filter(a => a.submissionId === row.id).reduce((sum, a) => sum + usdToCents(a.salesUsd), 0n);
      total += amount;
      result.reviews.push({ refundId: refund.id, reviewedBy: event.actor, reviewedAt: event.createdAt,
        productRefundUsd: centsToUsdString(amount), note: review.note });
    }
    result.salesUsd = centsToUsdString(total);
    return result;
  } catch {
    return unavailable("Historical refund attribution or snapshot is incomplete; adjustment unavailable.");
  }
}
