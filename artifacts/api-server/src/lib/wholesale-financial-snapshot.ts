import type { WholesaleFinancialLine } from "@workspace/db";
import { resolveFs3ProductCost, resolveFs3SupplierId } from "@workspace/api-zod/fs3-costs";
import { centsToUsdString, usdToCents } from "./refund-money";
import { VendorPortalError } from "./vendor-portal-model";

/** Existing commercial lines keep their cost even across shared-order re-locks. */
export function freezeCommercialLines(
  items: any[], previous: WholesaleFinancialLine[], products: any[], costs: any[], matches: any[], vendors: any[],
  defaultVendorId: string | null,
): WholesaleFinancialLine[] {
  return items.map(item => {
    const product = products.find(p => p.id === item.productId);
    const vendorId = resolveFs3SupplierId({ vendorId: item.vendorId, wholesaleVendorId: defaultVendorId }, product ?? {}, vendors);
    const prior = previous.find(line => line.productId === item.productId && line.vendorId === vendorId);
    const cost = prior ? prior.unitCost : resolveFs3ProductCost(product, costs, matches, item.productName, vendorId);
    return { productId: item.productId, productName: item.productName, vendorId,
      quantity: Number(item.quantity).toFixed(2), salesUsd: centsToUsdString(usdToCents(String(item.lineTotal))),
      unitCost: cost == null ? null : Number(cost).toFixed(2) };
  });
}

/** Keep line-total arithmetic exact even when same-name products have different costs. */
export function supplierFinancialItems(lines: WholesaleFinancialLine[]) {
  const groups = new Map<string, { quantity: bigint; cost: bigint }>();
  for (const line of lines) {
    if (line.unitCost == null) throw new VendorPortalError(`Historical supplier cost unavailable for ${line.productName}. Review the order-specific supplier costs; today's catalogue cannot replace an unknown old cost.`, 409);
    const quantity = BigInt(Math.round(Number(line.quantity) * 100));
    const cost = usdToCents(line.unitCost);
    if (quantity <= 0n) throw new VendorPortalError("Invalid saved supplier quantity.", 409);
    const group = groups.get(line.productName) ?? { quantity: 0n, cost: 0n };
    group.quantity += quantity;
    group.cost += (quantity * cost + 50n) / 100n;
    groups.set(line.productName, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([productName, group]) => ({
    productName, quantity: Number(group.quantity) / 100,
    unitCost: centsToUsdString((group.cost * 100n + group.quantity / 2n) / group.quantity),
    lineTotal: centsToUsdString(group.cost),
  }));
}
