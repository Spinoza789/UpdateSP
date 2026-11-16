import { describe, expect, it } from "vitest";
import { freezeCommercialLines, supplierFinancialItems } from "./wholesale-financial-snapshot";

const lines = [{ productId: "p", productName: "Product", quantity: "2.00", lineTotal: "60.00", vendorId: "v" }];
const products = [{ id: "p", wholesaleVendorId: "v", wholesaleCost: "10.00" }];
describe("committed wholesale commercial values", () => {
  it("keeps an earlier unsubmitted order cost, while new orders use changed costs", () => {
    const first = freezeCommercialLines(lines, [], products, [], [], [], null);
    const changed = [{ ...products[0], wholesaleCost: "19.00" }];
    expect(freezeCommercialLines(lines, first, changed, [], [], [], null)[0].unitCost).toBe("10.00");
    expect(freezeCommercialLines(lines, [], changed, [], [], [], null)[0].unitCost).toBe("19.00");
    expect(supplierFinancialItems(first)).toEqual([{ productName: "Product", quantity: 2, unitCost: "10.00", lineTotal: "20.00" }]);
  });
  it("does not backfill unknown historical costs from a later catalogue", () => {
    const first = freezeCommercialLines(lines, [], [{ ...products[0], wholesaleCost: null }], [], [], [], null);
    expect(first[0].unitCost).toBeNull();
    const later = freezeCommercialLines(lines, first, products, [], [], [], null);
    expect(later[0].unitCost).toBeNull();
    expect(() => supplierFinancialItems(later)).toThrow(/historical/i);
  });
  it("preserves exact fractional costs and supplier attribution without duplicate revenue", () => {
    const committed = freezeCommercialLines([
      { ...lines[0], quantity: "0.50", lineTotal: "15.00" },
      { ...lines[0], productId: "p2", vendorId: "other", quantity: "1.00", lineTotal: "50.00" },
    ], [], [...products, { id: "p2", wholesaleVendorId: "other", wholesaleCost: "22.00" }], [], [], [], null);
    expect(supplierFinancialItems(committed.filter(line => line.vendorId === "v"))[0].lineTotal).toBe("5.00");
    expect(committed.map(line => line.salesUsd)).toEqual(["15.00", "50.00"]);
  });
});
