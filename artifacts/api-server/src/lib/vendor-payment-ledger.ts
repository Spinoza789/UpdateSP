import type { VendorPaymentOrderDetail } from "@workspace/db";
import { createHash } from "node:crypto";
import { centsToUsdString, usdToCents } from "./refund-money";

const PAYABLE_STATUSES = new Set(["Submitted"]);
const PROGRESSED_STATUSES = new Set(["processing", "processed", "shipped", "completed"]);
const NOT_OWED_STATUSES = new Set(["Recalled", "Cancelled", "Canceled"]);
type Identity = {
  id: string; code?: string | null; telegramUsername?: string | null; status?: string | null;
  paymentTxHash?: string | null; paymentTxHashes?: string[] | null; testPaymentTxHash?: string | null;
  balanceTxHash?: string | null; paymentCryptoNetwork?: string | null; paymentCryptoCurrency?: string | null;
  balanceCryptoQuote?: unknown;
};
type Allocation = { paymentId: string; amountUsd: string };

function buyerTransactions(orderIds: string[], identities: Map<string, Identity>) {
  return orderIds.flatMap(orderId => {
    const order = identities.get(orderId);
    if (!order) return [];
    const balance = order.balanceCryptoQuote as { network?: string; currency?: string } | null;
    const seen = new Set<string>();
    const entries = [
      { kind: "Payment", values: [order.paymentTxHash, ...(order.paymentTxHashes ?? [])], network: order.paymentCryptoNetwork, currency: order.paymentCryptoCurrency },
      { kind: "Test payment", values: [order.testPaymentTxHash], network: order.paymentCryptoNetwork, currency: order.paymentCryptoCurrency },
      { kind: "Balance payment", values: [order.balanceTxHash], network: balance?.network, currency: balance?.currency },
    ];
    return entries.flatMap(entry => entry.values.flatMap(value => {
      if (typeof value !== "string") return [];
      // AnonPay may append an actual chain hash after its private session marker.
      return value.split("|").flatMap(part => {
        const txid = part.trim();
        if (!/^(?:0x[0-9a-fA-F]{64}|[0-9a-fA-F]{64}|[1-9A-HJ-NP-Za-km-z]{64,90})$/.test(txid)) return [];
        const key = txid.startsWith("0x") ? txid.toLowerCase() : txid;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ orderId, reference: order.code ?? orderId, kind: entry.kind, txid,
          network: entry.network ?? null, currency: entry.currency ?? null }];
      });
    }));
  });
}

function money(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  try { return centsToUsdString(usdToCents(String(value))); } catch { return null; }
}
function timestamp(value: unknown): string | null {
  if (!(typeof value === "string" || value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function paymentOrderDetail(row: any, identities = new Map<string, Identity>()): VendorPaymentOrderDetail {
  const snapshot = row.snapshot ?? {};
  const key = typeof row.sourceKey === "string" ? row.sourceKey.split(":vendor:")[0] : "";
  const shared = !!row.sharedOrderId || key.startsWith("share:");
  const ids: string[] = Array.isArray(row.orderIds) ? [...new Set<string>(row.orderIds.filter((id: unknown) => typeof id === "string"))] : [];
  return {
    sourceType: shared ? "shared" : "order",
    sourceId: shared ? row.sharedOrderId || key.slice(6) : key.startsWith("order:") ? key.slice(6) : ids[0] ?? "",
    submittedAt: timestamp(row.submittedAt),
    sourceOrders: ids.map(id => {
      const identity = identities.get(id);
      return { id, code: identity?.code ?? null, username: identity?.telegramUsername ?? null };
    }),
    items: Array.isArray(snapshot.items) ? snapshot.items.map((item: any) => ({
      productName: typeof item?.productName === "string" ? item.productName : "Product name unavailable",
      quantity: typeof item?.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : null,
      unitCost: money(item?.unitCost), lineTotal: money(item?.lineTotal),
    })) : [],
    productCost: money(snapshot.productCost), shippingCost: money(snapshot.shippingCost),
    totalCost: money(snapshot.totalCost), currency: "USD",
  };
}

/** No financial arithmetic uses floating-point or live catalogue/customer prices. */
export function supplierCostsValid(detail: VendorPaymentOrderDetail): boolean {
  if (detail.totalCost == null || detail.productCost == null || detail.shippingCost == null || !detail.items.length) return false;
  if (detail.items.some(i => i.quantity == null || i.unitCost == null || i.lineTotal == null)) return false;
  const lines = detail.items.reduce((sum, item) => sum + usdToCents(item.lineTotal!), 0n);
  return lines === usdToCents(detail.productCost)
    && usdToCents(detail.productCost) + usdToCents(detail.shippingCost) === usdToCents(detail.totalCost);
}

export function paymentReviewToken(row: any): string {
  // Project keys explicitly: PostgreSQL JSONB key order must not affect a review.
  return createHash("sha256").update(JSON.stringify({
    id: row.id, vendorId: row.vendorId, status: row.status,
    sourceFingerprint: row.sourceFingerprint, detail: paymentOrderDetail(row),
    paymentAcknowledgement: row.snapshot?.paymentAcknowledgement ?? null,
    productSales: row.snapshot?.productSales ?? null,
    productCostHistoryMissing: row.snapshot?.productCostHistoryMissing ?? false,
  })).digest("hex");
}

export function paymentOrderRow(row: any, stale: boolean, allocation: Allocation | null = null, identities = new Map<string, Identity>()) {
  const detail = paymentOrderDetail(row, identities);
  let paymentState: "owed" | "paid" | "needs_review" | "not_owed";
  let reviewReason: string | null = null;
  const acknowledgement = row.snapshot?.paymentAcknowledgement ?? null;
  const sourceOrders = detail.sourceOrders.map(order => ({
    ...order, status: identities.get(order.id)?.status ?? null,
  }));
  const progressed = [row.status, ...sourceOrders.map(order => order.status)]
    .some(status => typeof status === "string" && PROGRESSED_STATUSES.has(status.trim().toLowerCase()));
  if (allocation || acknowledgement) paymentState = "paid";
  else if (NOT_OWED_STATUSES.has(row.status)) { paymentState = "not_owed"; reviewReason = "This supplier shipment is no longer payable."; }
  else if (progressed) { paymentState = "needs_review"; reviewReason = "Order fulfilment has progressed but no supplier payment is recorded. Review the payment history before recording payment."; }
  else if (stale) { paymentState = "needs_review"; reviewReason = "Shipment changed after submission. Review and resubmit before recording payment."; }
  else if (!PAYABLE_STATUSES.has(row.status)) { paymentState = "needs_review"; reviewReason = "Shipment is on hold or its fulfilment status needs review."; }
  else if (!supplierCostsValid(detail)) { paymentState = "needs_review"; reviewReason = "Submitted supplier costs are missing or inconsistent. Review before recording payment."; }
  else if (usdToCents(detail.totalCost!) === 0n) { paymentState = "not_owed"; reviewReason = "No supplier balance to pay."; }
  else paymentState = "owed";
  // Admin-only live ledger context, deliberately excluded from immutable receipt details.
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  const shipping = row.snapshot?.shipping ?? {};
  return {
    id: row.id, reference: row.reference, status: row.status, stale,
    delivery: {
      name: text(shipping.name), address: text(shipping.address), country: text(shipping.country),
      phone: text(shipping.phone), email: text(shipping.email),
      carrier: text(row.carrier), trackingNumber: text(row.trackingNumber),
    },
    ...detail, sourceOrders, buyerTransactions: buyerTransactions(sourceOrders.map(order => order.id), identities),
    paymentId: allocation?.paymentId ?? null,
    reviewToken: paymentReviewToken(row),
    paidAmountUsd: allocation ? money(allocation.amountUsd) : acknowledgement ? money(acknowledgement.amountUsd) : null,
    paymentAcknowledgement: acknowledgement,
    paymentState, eligible: paymentState === "owed", reviewReason,
  };
}
export type SupplierPaymentOrder = ReturnType<typeof paymentOrderRow>;

export function paymentRemovalPermission(row: any, hasAllocation: boolean, hasImages: boolean) {
  if (hasAllocation) return { canRemove: false, removalReason: "Void the supplier payment receipt before removing this submission." };
  if (row.status !== "Submitted") return { canRemove: true, requiresRemovalOverride: true, removalReason: "Vendor fulfilment has started. Admin override and a reason are required. Coordinate with the vendor before removing this shipment." };
  if (hasImages) return { canRemove: true, requiresRemovalOverride: true, removalReason: "Vendor photos have been uploaded. Admin override and a reason are required. Coordinate with the vendor before removing this shipment." };
  return { canRemove: true, removalReason: null };
}

export function paymentLedgerSummary(orders: SupplierPaymentOrder[]) {
  const values = {
    owed: { cents: 0n, count: 0 }, paid: { cents: 0n, count: 0 },
    needsReview: { cents: 0n, count: 0 }, notOwed: { cents: 0n, count: 0 },
  };
  let unavailableCount = 0;
  for (const order of orders) {
    const key = order.paymentState === "needs_review" ? "needsReview" : order.paymentState === "not_owed" ? "notOwed" : order.paymentState;
    const group = values[key];
    group.count++;
    const amount = order.paymentState === "paid" ? order.paidAmountUsd : order.totalCost;
    if (amount == null) unavailableCount++;
    else group.cents += usdToCents(amount);
  }
  const project = (group: { cents: bigint; count: number }) => ({ amount: centsToUsdString(group.cents), count: group.count });
  return {
    currency: "USD" as const, owed: project(values.owed), paid: project(values.paid),
    needsReview: project(values.needsReview), notOwed: project(values.notOwed), unavailableCount,
  };
}

/** Vendor history keeps its existing public contract; Admin receipt identities stay private. */
export function publicVendorReceipt(payment: any) {
  return {
    id: payment.id, txid: payment.txid, currency: payment.currency, network: payment.network,
    cryptoAmount: payment.cryptoAmount, usdAmount: payment.usdAmount, walletSnapshot: payment.walletSnapshot,
    orders: (payment.orders ?? []).map((order: any) => ({
      submissionId: order.submissionId, reference: order.reference, amountUsd: order.amountUsd,
    })),
    paidAt: payment.paidAt, recordedAt: payment.recordedAt,
    voidedAt: payment.voidedAt, voidReason: payment.voidReason,
  };
}
