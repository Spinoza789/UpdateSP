import { describe, expect, it } from "vitest";
import { calcTotalShipping, parseFreeShippingThreshold } from "./wholesale-shipping";
import { quoteVendorShipping } from "./multi-vendor-shipping";

const vendor = {
  id: "one", name: "One", tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25,
  freeShippingThreshold: 500,
  regions: [{ name: "UK", countries: ["GB"], prices: [60] }],
};

describe("wholesale free shipping", () => {
  it("waives shipping exactly at and above the threshold, not below", () => {
    expect(calcTotalShipping(vendor, vendor.regions[0], 2, 499.99)).toBe(60);
    expect(calcTotalShipping(vendor, vendor.regions[0], 2, 500)).toBe(0);
    expect(calcTotalShipping(vendor, vendor.regions[0], 2, 750)).toBe(0);
  });
  it("keeps old callers and disabled or invalid thresholds on normal rates", () => {
    expect(calcTotalShipping(vendor, vendor.regions[0], 2)).toBe(60);
    for (const threshold of [null, undefined, 0, -1, NaN, Infinity]) {
      expect(calcTotalShipping({ ...vendor, freeShippingThreshold: threshold }, vendor.regions[0], 2, 900)).toBe(60);
    }
    for (const subtotal of [NaN, Infinity, -1]) {
      expect(calcTotalShipping(vendor, vendor.regions[0], 2, subtotal)).toBe(60);
    }
  });
  it("does not turn unavailable/custom destination quotes into free shipping", () => {
    expect(calcTotalShipping(vendor, { name: "Manual", customNote: "Quote required" }, 2, 500)).toBeNull();
    expect(quoteVendorShipping([vendor], [[{ vendorId: "one", quantity: 1, unitPrice: 500 }]], "XX", "even").total).toBeNull();
  });
  it("combines all members for one vendor without counting other vendors", () => {
    const second = { ...vendor, id: "two", name: "Two", freeShippingThreshold: 1000 };
    const quote = quoteVendorShipping([vendor, second], [
      [{ vendorId: "one", quantity: 2, unitPrice: 100 }, { vendorId: "two", quantity: 1, unitPrice: 900 }],
      [{ vendorId: "one", quantity: 3, unitPrice: 100 }],
    ], "GB", "even");
    expect(quote.breakdown.map(p => p.shipping)).toEqual([0, 60]);
    expect(quote.members.map(parts => parts.reduce((s, p) => s + p.shipping!, 0))).toEqual([60, 0]);
    expect(quote.total).toBe(60);
  });
  it("preserves an explicit staff shipping override", () => {
    const quote = quoteVendorShipping([vendor], [[{ vendorId: "one", quantity: 2, unitPrice: 500 }]], "GB", "even", null, 25);
    expect(quote.total).toBe(25);
  });
  it("validates optional thresholds without silently coercing bad values", () => {
    expect(parseFreeShippingThreshold(null)).toBeNull();
    expect(parseFreeShippingThreshold(500.50)).toBe(500.50);
    for (const bad of [0, -1, "500", "", NaN, Infinity, 1.001, 100000000]) {
      expect(() => parseFreeShippingThreshold(bad)).toThrow();
    }
  });
});
