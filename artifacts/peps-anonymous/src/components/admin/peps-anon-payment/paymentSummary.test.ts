import { describe, expect, it } from "vitest";
import { paymentSummary } from "./paymentSummary";
import type { LedgerOrder } from "./model";

const order = (productCost: string, shippingCost: string, sales: string, profit: string): LedgerOrder => ({
  id: "submission", reference: "12939", status: "Submitted", stale: false, paymentId: null,
  productCost, shippingCost, totalCost: "945.00",
  profit: { currency: "USD", basis: "product_gross", salesUsd: sales, amountUsd: profit,
    supplierProductsUsd: productCost, reason: null, definition: "Product gross profit" },
});

describe("selected payment snapshot summary", () => {
  it("sums product costs, shipping, historical sales and signed profit with a weighted margin", () => {
    const summary = paymentSummary([order("900.00", "45.00", "1000.00", "100.00"), order("200.00", "10.00", "250.00", "50.00")]);
    expect(summary).toMatchObject({ productCost: 110000n, shipping: 5500n, sales: 125000n, profit: 15000n, margin: "12.00%", incomplete: false });
  });
  it("keeps negative margins and rounds only the final weighted percentage", () => {
    expect(paymentSummary([order("120.00", "0.00", "100.00", "-20.00")])).toMatchObject({ profit: -2000n, margin: "-20.00%" });
    expect(paymentSummary([order("2.00", "0.00", "3.00", "1.00")]).margin).toBe("33.33%");
    expect(paymentSummary([order("0.00", "0.00", "0.00", "0.00")])).toMatchObject({ sales: 0n, profit: 0n, margin: null, incomplete: false });
  });
  it("does not turn missing or malformed history into zero or show partial totals", () => {
    const missing = { ...order("200.00", "10.00", "250.00", "50.00"), productCost: null, shippingCost: null,
      profit: { ...order("1", "1", "1", "0").profit!, salesUsd: null, amountUsd: null, supplierProductsUsd: null } };
    expect(paymentSummary([order("900.00", "45.00", "1000.00", "100.00"), missing])).toMatchObject({
      productCost: null, shipping: null, sales: null, profit: null, margin: null, incomplete: true,
    });
    expect(paymentSummary([{ ...order("900", "45", "1000", "100"), productCost: "NaN" }]).productCost).toBeNull();
    expect(paymentSummary([{ ...order("900", "45", "1000", "100"), currencyUSD: false }])).toMatchObject({
      productCost: null, shipping: null, sales: null, profit: null, incomplete: true,
    });
  });
  it("uses existing submitted cost history when the duplicate productCost field is absent", () => {
    expect(paymentSummary([{ ...order("900.00", "45.00", "1000.00", "100.00"), productCost: null }]).productCost).toBe(90000n);
  });
  it("shows no invented totals for an empty selection", () => {
    expect(paymentSummary([])).toMatchObject({ productCost: null, shipping: null, sales: null, profit: null, margin: null, incomplete: false });
  });
});
