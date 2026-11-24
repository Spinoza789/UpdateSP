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
}, products: ReadonlyArray<{ id: string; feePerKit: number; chargeFullFeeOnHalfKit?: boolean }>): number {
  if (!draft.groupBuyId || draft.orderType === "wholesale" || draft.additionOfOrderId
    || draft.directShippingRequested || draft.halfKitCheckout) return 0;
  // Match the server: combine quantities per product, apply its rule, round once.
  const quantities = new Map<string, number>();
  for (const item of draft.lineItems) {
    if (item.productId) quantities.set(item.productId,
      (quantities.get(item.productId) ?? 0) + Math.round(item.quantity * 100));
  }
  const hundredthsOfCents = products.reduce((sum, product) => {
    const quantity = Math.max(0, quantities.get(product.id) ?? 0);
    const billable = product.chargeFullFeeOnHalfKit ? Math.ceil(quantity / 100) * 100 : quantity;
    return sum + Math.max(0, Math.round(product.feePerKit * 100)) * billable;
  }, 0);
  return Math.round(hundredthsOfCents / 100) / 100;
}
