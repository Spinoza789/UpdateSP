import { centsToUsdString, usdToCents } from "./refund-money";
import { paymentOrderDetail, supplierCostsValid } from "./vendor-payment-ledger";

const definition = "Customer product sales for this supplier minus submitted supplier product costs. Before shipping, order-level discounts, credits, fees, tax and overheads; not net profit.";

/** Admin-only estimate. Never allocate an entire mixed/shared customer order to each supplier. */
export function vendorProductProfit(row: any, source: any, stale: boolean) {
  const detail = paymentOrderDetail(row);
  const result = {
    currency: "USD" as const, basis: "product_gross" as const,
    salesUsd: null as string | null, supplierProductsUsd: detail.productCost,
    amountUsd: null as string | null, reason: null as string | null, definition,
    lines: null as Array<{ productName: string; salesUsd: string; amountUsd: string }> | null,
  };
  if (stale || !source || source.fingerprint !== row.sourceFingerprint) {
    result.reason = "Current order does not match the supplier submission. Review and resubmit before estimating profit.";
    return result;
  }
  if (!Array.isArray(source.vendorIds) || source.vendorIds.length !== 1 || source.vendorIds[0] !== row.vendorId
    || !Array.isArray(source.items) || !source.items.length || source.items.some((item: any) => item.vendorId !== row.vendorId)) {
    result.reason = "Product sales cannot be attributed to this supplier reliably.";
    return result;
  }
  if (!supplierCostsValid(detail)) {
    result.reason = "Submitted supplier costs are unavailable or inconsistent.";
    return result;
  }
  try {
    const sales = source.items.reduce((sum: bigint, item: any) => sum + usdToCents(item.lineTotal), 0n);
    const profit = sales - usdToCents(detail.productCost!);
    result.salesUsd = centsToUsdString(sales);
    result.amountUsd = profit < 0n ? `-${centsToUsdString(-profit)}` : centsToUsdString(profit);
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
