// Display-only companion to the API's server-authoritative shipping calculator.
// An unavailable quote must stay unavailable even when the subtotal qualifies.
export function applyWholesaleFreeShipping(
  shipping: number | null, productSubtotal: number, threshold?: number | null,
): number | null {
  if (shipping === null) return null;
  return typeof threshold === "number" && Number.isFinite(threshold) && threshold > 0
    && Number.isFinite(productSubtotal) && productSubtotal >= 0
    && Math.round(productSubtotal * 100) >= Math.round(threshold * 100) ? 0 : shipping;
}
