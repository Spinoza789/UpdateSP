import { describe, expect, it } from "vitest";
import { vendorProductProfit } from "./vendor-payment-profit";

const row = () => ({
  vendorId: "v1", sourceKey: "order:o1", sourceFingerprint: "fp", orderIds: ["o1"],
  snapshot: { currency: "USD", productCost: "20.20", shippingCost: "5.00", totalCost: "25.20",
    items: [{ productName: "Product", quantity: 2, unitCost: "10.10", lineTotal: "20.20" }] },
});
const source = (items = [{ vendorId: "v1", lineTotal: "30.30" }]) => ({
  fingerprint: "fp", vendorIds: ["v1"], items,
  orders: [{ grandTotal: "999", productSubtotal: "888", vendorShipping: "50", creditsApplied: 100 }],
});
describe("Admin supplier-scoped product profit", () => {
  it("includes per-product sales and profit, combining shared members by product name", () => {
    const detail = vendorProductProfit(row(), source([
      { vendorId: "v1", productName: "Product", quantity: "0.5", lineTotal: "10.00" },
      { vendorId: "v1", productName: "Product", quantity: "1.5", lineTotal: "20.30" },
    ] as any), false);
    expect(detail.lines).toEqual([{ productName: "Product", salesUsd: "30.30", amountUsd: "10.10" }]);
  });
  it("preserves negative line profit and refuses stale or mismatched line estimates", () => {
    const lines = [{ vendorId: "v1", productName: "Product", quantity: 2, lineTotal: "10.00" }];
    expect(vendorProductProfit(row(), source(lines as any), false).lines?.[0].amountUsd).toBe("-10.20");
    expect(vendorProductProfit(row(), source(lines as any), true).lines).toBeNull();
    expect(vendorProductProfit(row(), source([{ ...lines[0], quantity: 3 }] as any), false).lines).toBeNull();
    expect(vendorProductProfit(row(), source([{ ...lines[0], productName: "Different" }] as any), false).lines).toBeNull();
  });
  it("uses exact customer product lines minus submitted product costs, not full order totals", () => {
    expect(vendorProductProfit(row(), source(), false)).toMatchObject({
      currency: "USD", basis: "product_gross", salesUsd: "30.30", supplierProductsUsd: "20.20", amountUsd: "10.10", reason: null,
    });
  });
  it("supports negative profit and zero profit without clamping a loss", () => {
    expect(vendorProductProfit(row(), source([{ vendorId: "v1", lineTotal: "10.10" }]), false).amountUsd).toBe("-10.10");
    expect(vendorProductProfit(row(), source([{ vendorId: "v1", lineTotal: "20.20" }]), false).amountUsd).toBe("0.00");
  });
  it("sums only already supplier-scoped shared-order lines, not constituent order totals", () => {
    expect(vendorProductProfit(row(), source([{ vendorId: "v1", lineTotal: "10.10" }, { vendorId: "v1", lineTotal: "20.20" }]), false).salesUsd).toBe("30.30");
    expect(vendorProductProfit(row(), source([{ vendorId: "v1", lineTotal: "10.10" }, { vendorId: "other", lineTotal: "999" }]), false).amountUsd).toBeNull();
  });
  it("does not invent zero revenue or zero costs for missing, malformed or stale details", () => {
    for (const value of [null, {}, source([{ vendorId: "v1", lineTotal: "NaN" }]), { ...source(), fingerprint: "different" }]) {
      const profit = vendorProductProfit(row(), value, false);
      expect(profit.amountUsd).toBeNull(); expect(profit.reason).toBeTruthy();
    }
    expect(vendorProductProfit(row(), source(), true).amountUsd).toBeNull();
    expect(vendorProductProfit({ ...row(), snapshot: {} }, source(), false).amountUsd).toBeNull();
  });
  it("makes the product-only estimate explicit rather than claiming net profit", () => {
    expect(vendorProductProfit(row(), source(), false).definition).toMatch(/shipping/i);
    expect(vendorProductProfit(row(), source(), false).definition).toMatch(/discount/i);
    expect(vendorProductProfit(row(), source(), false).definition).toMatch(/not net profit/i);
  });
});
