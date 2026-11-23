export function calculateOrderFormTotal(input: {
  lineTotals: number[];
  deliveryPrice: number;
  vendorShipping: number;
  tip: number;
  testingContribution: number;
  adminFee: number;
  kitFees?: number;
  isTopUp: boolean;
}): number {
  const subtotal = Number(input.lineTotals.reduce((sum, total) => sum + total, 0).toFixed(2));
  const shippingAndFee = input.isTopUp ? 0 : input.deliveryPrice + input.vendorShipping + input.adminFee + (input.kitFees ?? 0);
  return Number(Math.max(0, subtotal + shippingAndFee + input.tip + input.testingContribution).toFixed(2));
}

export function calculateOrderKitFees(draft: {
  groupBuyId: string | null;
  orderType: string | null;
  additionOfOrderId: string | null;
  directShippingRequested: boolean;
  halfKitCheckout: unknown;
  lineItems: ReadonlyArray<{ productId: string | null; quantity: number }>;
}, products: ReadonlyArray<{ id: string; feePerKit: number }>): number {
  if (!draft.groupBuyId || draft.orderType === "wholesale" || draft.additionOfOrderId
    || draft.directShippingRequested || draft.halfKitCheckout) return 0;
  // Match the server: sum cents × quantity hundredths, then round once.
  const rates = new Map(products.map(product => [product.id, Math.round(product.feePerKit * 100)]));
  const hundredthsOfCents = draft.lineItems.reduce((sum, item) =>
    sum + Math.max(0, rates.get(item.productId ?? "") ?? 0) * Math.round(item.quantity * 100), 0);
  return Math.round(hundredthsOfCents / 100) / 100;
}
