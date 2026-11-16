import { cents, signedCents, type LedgerOrder } from "./model";

/** Aggregate submitted historical values only; incomplete metrics are not partial totals. */
export function paymentSummary(orders: LedgerOrder[]) {
  const sum = (value: (order: LedgerOrder) => bigint | null): bigint | null => {
    if (!orders.length) return null;
    let total = 0n;
    for (const order of orders) {
      if (order.currencyUSD === false) return null;
      const amount = value(order);
      if (amount === null) return null;
      total += amount;
    }
    return total;
  };
  const validProfit = (order: LedgerOrder) =>
    order.profit?.currency === "USD" && order.profit.basis === "product_gross";
  const productCost = sum(order => cents(order.productCost ?? (validProfit(order) ? order.profit!.supplierProductsUsd : null)));
  const shipping = sum(order => cents(order.shippingCost));
  const sales = sum(order => validProfit(order) ? cents(order.profit!.salesUsd) : null);
  const profit = sum(order => validProfit(order) ? signedCents(order.profit!.amountUsd) : null);
  let margin: string | null = null;
  if (sales !== null && sales > 0n && profit !== null) {
    const absolute = profit < 0n ? -profit : profit;
    const hundredths = (absolute * 10_000n + sales / 2n) / sales;
    margin = `${profit < 0n && hundredths > 0n ? "-" : ""}${hundredths / 100n}.${String(hundredths % 100n).padStart(2, "0")}%`;
  }
  return { productCost, shipping, sales, profit, margin,
    incomplete: orders.length > 0 && [productCost, shipping, sales, profit].some(value => value === null) };
}
