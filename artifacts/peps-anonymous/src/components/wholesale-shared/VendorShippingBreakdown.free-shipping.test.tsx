import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VendorShippingBreakdown } from "./VendorShippingBreakdown";

it("shows free shipping for a qualifying vendor, including a single-vendor order", () => {
  const lines = [{ vendorId: "one", vendorName: "One", kits: 5, shipping: 0 }];
  expect(renderToStaticMarkup(createElement(VendorShippingBreakdown, { lines }))).toContain("Free shipping");
  expect(renderToStaticMarkup(createElement(VendorShippingBreakdown, {
    lines: [...lines, { vendorId: "two", vendorName: "Two", kits: 2, shipping: 60 }],
  }))).toContain("$60.00");
});
