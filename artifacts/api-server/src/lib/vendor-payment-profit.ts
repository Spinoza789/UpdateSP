import { centsToUsdString, usdToCents } from "./refund-money";
import { paymentOrderDetail, supplierCostsValid } from "./vendor-payment-ledger";
import type { VendorSnapshot } from "@workspace/db";

const definition = "Customer product sales for this supplier minus submitted supplier product costs. Before shipping, order-level discounts, credits, fees, tax and overheads; not net profit.";

export function signedUsd(cents: bigint) {
  return cents < 0n ? `-${centsToUsdString(-cents)}` : centsToUsdString(cents);
}
/** Hundredths of a percent, rounded half away from zero, using cents only. */
export function productMargin(profit: bigint, sales: bigint): string | null {
  if (sales <= 0n) return null;
  const absolute = profit < 0n ? -profit : profit;
  const rounded = (absolute * 10000n + sales / 2n) / sales;
  return `${profit < 0n && rounded > 0n ? "-" : ""}${rounded / 100n}.${String(rounded % 100n).padStart(2, "0")}`;
}

export function snapshotProductSales(items: any[], memberIdentities?: Array<{ orderId: string; vendorId: string }>): NonNullable<VendorSnapshot["productSales"]> {
  const groups = new Map<string, { productName: string; quantity: number; salesUsd: string }>();
  for (const item of items) {
    if (!item.productName || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) throw new Error("Invalid product sales");
    const previous = groups.get(item.productName);
    groups.set(item.productName, { productName: item.productName,
      quantity: ((previous ? Math.round(previous.quantity * 100) : 0) + Math.round(Number(item.quantity) * 100)) / 100,
      salesUsd: centsToUsdString(usdToCents(previous?.salesUsd ?? "0") + usdToCents(String(item.lineTotal))),
    });
  }
  if (!groups.size) throw new Error("Missing product sales");
  const lines = [...groups.values()].sort((a, b) => a.productName.localeCompare(b.productName));
  const result = { currency: "USD" as const, salesUsd: centsToUsdString(lines.reduce((sum, line) => sum + usdToCents(line.salesUsd), 0n)), lines };
  if (!memberIdentities) return result;
  if (memberIdentities.length !== items.length || memberIdentities.some(i => !i.orderId || !i.vendorId))
    throw new Error("Missing member identity for submitted product sales");
  const members = new Map<string, { orderId: string; vendorId: string; productName: string; quantity: number; salesUsd: string }>();
  items.forEach((item, index) => {
    const identity = memberIdentities[index], key = JSON.stringify([identity.orderId, identity.vendorId, item.productName]);
    const previous = members.get(key);
    members.set(key, { ...identity, productName: item.productName,
      quantity: ((previous ? Math.round(previous.quantity * 100) : 0) + Math.round(Number(item.quantity) * 100)) / 100,
      salesUsd: centsToUsdString(usdToCents(previous?.salesUsd ?? "0") + usdToCents(String(item.lineTotal))) });
  });
  return { ...result, orderLines: [...members.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}

/** Admin-only estimate. Never allocate an entire mixed/shared customer order to each supplier. */
export function vendorProductProfit(row: any, source: any, stale: boolean) {
  const detail = paymentOrderDetail(row);
  const result = {
    currency: "USD" as const, basis: "product_gross" as const,
    salesUsd: null as string | null, supplierProductsUsd: detail.productCost,
    amountUsd: null as string | null, marginPercent: null as string | null, reason: null as string | null, definition,
    lines: null as Array<{ productName: string; salesUsd: string; amountUsd: string }> | null,
  };
  const frozen = row.snapshot?.productSales;
  if (frozen) {
    try {
      const reconstructed = snapshotProductSales(frozen.lines.map((line: any) => ({ ...line, lineTotal: line.salesUsd })));
      if (frozen.currency !== "USD" || reconstructed.salesUsd !== frozen.salesUsd) throw Error();
      result.salesUsd = reconstructed.salesUsd;
      if (row.snapshot.productCostHistoryMissing) {
        result.reason = "Supplier cost was unavailable when this order was committed. Review and save its order-specific supplier costs to establish profit; today's catalogue has not been assumed to be its historical cost.";
        return result;
      }
      if (!supplierCostsValid(detail)) throw Error();
      const sales = usdToCents(reconstructed.salesUsd), profit = sales - usdToCents(detail.productCost!);
      if (reconstructed.lines.length !== detail.items.length || detail.items.some(item =>
        !reconstructed.lines.some(line => line.productName === item.productName && line.quantity === item.quantity))) throw Error();
      result.amountUsd = signedUsd(profit);
      result.marginPercent = productMargin(profit, sales);
      result.lines = detail.items.map(item => {
        const line = reconstructed.lines.find(line => line.productName === item.productName)!;
        return { productName: item.productName, salesUsd: line.salesUsd, amountUsd: signedUsd(usdToCents(line.salesUsd) - usdToCents(item.lineTotal!)) };
      });
    } catch { result.reason = "Historical product sales or supplier costs are incomplete or inconsistent. No profit has been assumed."; }
    return result;
  }
  if (stale || !source || source.fingerprint !== row.sourceFingerprint) {
    result.reason = "Current order does not match the supplier submission. Review and resubmit before estimating profit.";
    return result;
  }
  if (!Array.isArray(source.vendorIds) || source.vendorIds.length !== 1 || source.vendorIds[0] !== row.vendorId
    || !Array.isArray(source.items) || !source.items.length || source.items.some((item: any) => item.vendorId !== row.vendorId)) {
    result.reason = "Product sales cannot be attributed to this supplier reliably.";
    return result;
  }
  try {
    const sales = source.items.reduce((sum: bigint, item: any) => sum + usdToCents(item.lineTotal), 0n);
    result.salesUsd = centsToUsdString(sales);
    if (!supplierCostsValid(detail)) {
      result.reason = "Submitted supplier costs are unavailable or inconsistent.";
      return result;
    }
    const profit = sales - usdToCents(detail.productCost!);
    result.amountUsd = profit < 0n ? `-${centsToUsdString(-profit)}` : centsToUsdString(profit);
    result.marginPercent = productMargin(profit, sales);
  } catch {
    result.reason = "Customer product sales are unavailable. No profit has been assumed.";
  }
  if (result.reason) return result;
  // The supplier snapshot groups lines by exact product name. Match that same
  // grouping, including quantities, instead of looking up today's catalogue price.
  try {
    const salesByName = new Map<string, { sales: bigint; quantity: number }>();
    for (const item of source.items) {
      const quantity = Number(item.quantity);
      if (typeof item.productName !== "string" || !item.productName || !Number.isFinite(quantity) || quantity <= 0) return result;
      const current = salesByName.get(item.productName) ?? { sales: 0n, quantity: 0 };
      current.sales += usdToCents(item.lineTotal);
      current.quantity += Math.round(quantity * 100);
      salesByName.set(item.productName, current);
    }
    if (salesByName.size !== detail.items.length) return result;
    const lines = [];
    for (const item of detail.items) {
      const sale = salesByName.get(item.productName);
      if (!sale || item.quantity == null || sale.quantity !== Math.round(item.quantity * 100)) return result;
      const profit = sale.sales - usdToCents(item.lineTotal!);
      lines.push({
        productName: item.productName,
        salesUsd: centsToUsdString(sale.sales),
        amountUsd: profit < 0n ? `-${centsToUsdString(-profit)}` : centsToUsdString(profit),
      });
    }
    result.lines = lines;
  } catch {
    // Old or incomplete line details must not turn into invented zero margins.
    result.lines = null;
  }
  return result;
}
