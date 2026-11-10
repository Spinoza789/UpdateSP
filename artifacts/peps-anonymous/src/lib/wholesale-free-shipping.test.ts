import { describe, expect, it } from "vitest";
import { applyWholesaleFreeShipping } from "./wholesale-free-shipping";

describe("wholesale free-shipping checkout preview", () => {
  it("matches cent-based threshold boundaries", () => {
    expect(applyWholesaleFreeShipping(60, 499.99, 500)).toBe(60);
    expect(applyWholesaleFreeShipping(60, 500, 500)).toBe(0);
    expect(applyWholesaleFreeShipping(60, 501, 500)).toBe(0);
  });
  it("keeps unavailable and disabled quotes unchanged", () => {
    expect(applyWholesaleFreeShipping(null, 1000, 500)).toBeNull();
    for (const threshold of [null, undefined, 0, -1, Infinity, NaN]) {
      expect(applyWholesaleFreeShipping(60, 1000, threshold)).toBe(60);
    }
  });
});
