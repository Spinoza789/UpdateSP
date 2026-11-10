import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { FreeShippingNotice } from "./FreeShippingNotice";

it("advertises the selected vendor's configured threshold", () => {
  const html = renderToStaticMarkup(createElement(FreeShippingNotice, {
    vendor: { name: "JBG/YT", freeShippingThreshold: 1000 },
  }));
  expect(html).toContain("Free shipping on orders over $1,000");
  expect(html).toContain("JBG/YT");
  expect(html).toContain("before credits");
  const other = renderToStaticMarkup(createElement(FreeShippingNotice, {
    vendor: { name: "Uther", freeShippingThreshold: 750.5 },
  }));
  expect(other).toContain("$750.50");
  expect(other).not.toContain("$1,000");
});

it("hides the offer when no vendor or valid threshold is available", () => {
  expect(renderToStaticMarkup(createElement(FreeShippingNotice, { vendor: null }))).toBe("");
  for (const freeShippingThreshold of [undefined, null, 0, -1, NaN, Infinity]) {
    expect(renderToStaticMarkup(createElement(FreeShippingNotice, {
      vendor: { name: "Vendor", freeShippingThreshold },
    }))).toBe("");
  }
});
