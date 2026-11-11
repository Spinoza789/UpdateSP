import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { OrderBreakdown, type BreakdownSource } from "./OrderBreakdown";

const src = {
  items: [{ productName: "Product", quantity: 2, unitCost: "10.10", lineTotal: "20.20" }],
  productCost: "20.20", shippingCost: "5.00", totalCost: "25.20",
  profit: {
    currency: "USD", basis: "product_gross", salesUsd: "30.30",
    supplierProductsUsd: "20.20", amountUsd: "10.10", reason: null, definition: "Not net profit",
    lines: [{ productName: "Product", salesUsd: "30.30", amountUsd: "10.10" }],
  },
} satisfies BreakdownSource;

it("shows per-product sold totals and profit alongside supplier costs", () => {
  const html = renderToStaticMarkup(createElement(OrderBreakdown, { src }));
  expect(html).toContain("Sold price (total)");
  expect(html).toContain("Product profit");
  expect(html).toContain("$30.30");
  expect(html).toContain("$10.10");
  expect(html).toContain("$25.20");
  expect(html).not.toContain("Customer prices and margins are not shown");
});

it("shows losses and unavailable lines honestly", () => {
  const html = renderToStaticMarkup(createElement(OrderBreakdown, {
    src: { ...src, profit: { ...src.profit, lines: [{ productName: "Product", salesUsd: "10.00", amountUsd: "-10.20" }] } },
  }));
  expect(html).toContain("-$10.20");
  const unavailable = renderToStaticMarkup(createElement(OrderBreakdown, {
    src: { ...src, profit: { ...src.profit, lines: null, salesUsd: null, amountUsd: null, reason: "Stale" } },
  }));
  expect(unavailable).toContain("Unavailable");
  expect(unavailable).not.toContain("$30.30");
});

it("keeps historical supplier-only receipt details unchanged", () => {
  const { profit, ...receipt } = src;
  const html = renderToStaticMarkup(createElement(OrderBreakdown, { src: receipt }));
  expect(html).not.toContain("Sold price (total)");
  expect(html).not.toContain("Product profit");
  expect(html).toContain("$25.20");
});
