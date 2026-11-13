import { describe, expect, it } from "vitest";
import { mapBatchWholesaleItems } from "./supplier-batch-wholesale-model";

const product = { id: "wh", name: "Retatrutide 10mg", wholesalePrice: "80", price: "90" };
const batch = [{ productId: "gb", productName: product.name, quantity: 2 }];
describe("batch wholesale catalogue mapping", () => {
  it("uses catalogue prices rather than group-buy prices", () => {
    expect(mapBatchWholesaleItems(batch, [product])).toEqual([
      { productId: "wh", productName: product.name, quantity: 2, unitPrice: 80, lineTotal: 160 },
    ]);
  });
  it("rejects absent and ambiguous product matches", () => {
    expect(() => mapBatchWholesaleItems(batch, [])).toThrow(/match/i);
    expect(() => mapBatchWholesaleItems(batch, [product, { ...product, id: "other" }])).toThrow(/match/i);
  });
  it("does not confuse strengths", () => {
    expect(() => mapBatchWholesaleItems(batch, [{ ...product, name: "Retatrutide 20mg" }])).toThrow(/match/i);
  });
  it("rejects missing, zero and invalid prices", () => {
    for (const price of [null, "0", "NaN", "-2"]) {
      expect(() => mapBatchWholesaleItems(batch, [{ ...product, wholesalePrice: price, price }])) .toThrow(/price/i);
    }
  });
  it("rejects invalid quantities and empty batches", () => {
    expect(() => mapBatchWholesaleItems([], [product])).toThrow();
    for (const quantity of [0, -1, 0.3, NaN, 1001]) {
      expect(() => mapBatchWholesaleItems([{ ...batch[0], quantity }], [product])).toThrow(/quantity/i);
    }
  });
  it("combines quantities mapping to the same catalogue product", () => {
    expect(mapBatchWholesaleItems([...batch, { ...batch[0], productId: "other", quantity: 0.5 }], [product])[0].quantity).toBe(2.5);
  });
});
