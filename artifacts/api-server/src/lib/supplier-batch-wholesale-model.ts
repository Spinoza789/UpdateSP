export function mapBatchWholesaleItems(
  items: { productId: string; productName: string; quantity: number }[],
  catalogue: { id: string; name: string; wholesalePrice: string | null; price: string | null }[],
): { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[] {
  if (!items.length) throw new Error("The batch is empty.");
  const name = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const mapped = new Map<string, { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }>();
  for (const item of items) {
    const exact = catalogue.filter(p => p.id === item.productId);
    const matches = exact.length ? exact : catalogue.filter(p => name(p.name) === name(item.productName));
    if (matches.length !== 1) throw new Error(`Set up one exact Uther wholesale catalogue match for ${item.productName}.`);
    const p = matches[0];
    const price = Number(p.wholesalePrice ?? p.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Set a positive wholesale price for ${p.name}.`);
    const quantity = (mapped.get(p.id)?.quantity ?? 0) + item.quantity;
    if (!Number.isFinite(item.quantity) || item.quantity < 0.5 || !Number.isInteger(item.quantity * 2) || quantity > 1000) {
      throw new Error(`Invalid wholesale quantity for ${p.name}; use 0.5–1000 kits in half-kit steps.`);
    }
    mapped.set(p.id, { productId: p.id, productName: p.name, quantity, unitPrice: price, lineTotal: Number((quantity * price).toFixed(2)) });
  }
  return [...mapped.values()].sort((a, b) => a.productId.localeCompare(b.productId));
}
