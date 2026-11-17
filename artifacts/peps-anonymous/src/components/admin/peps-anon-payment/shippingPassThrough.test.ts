import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { paymentSummary } from "./paymentSummary";
import { PaymentSummary } from "./PaymentSummary";
import type { LedgerOrder } from "./model";

const order = (productCost: string, shippingCost: string, sales: string, profit: string): LedgerOrder => ({
  id: "submission", reference: "order", status: "Submitted", stale: false, paymentId: null,
  productCost, shippingCost, totalCost: String(Number(productCost) + Number(shippingCost)),
  profit: { currency: "USD", basis: "product_gross", salesUsd: sales, amountUsd: profit,
    supplierProductsUsd: productCost, reason: null, definition: "Product gross profit" },
});

describe("shipping is separate from product profit", () => {
  it("keeps the example at $329 and 17.41% regardless of supplier shipping", () => {
    const chosen = [order("1250.00", "60.00", "1550.00", "300.00"), order("311.00", "80.00", "340.00", "29.00")];
    expect(paymentSummary(chosen)).toMatchObject({ profit: 32900n, margin: "17.41%", shipping: 14000n });
    const html = renderToStaticMarkup(createElement(PaymentSummary, { chosen, total: 170100n }));
    expect(html).toContain("$329.00");
    expect(html).toContain("17.41%");
    expect(html).toContain("$1,701.00");
    expect(html).not.toMatch(/profit after shipping|margin after shipping/i);
    expect(paymentSummary(chosen.map(o => ({ ...o, shippingCost: "999.00" })))).toMatchObject({ profit: 32900n, margin: "17.41%" });
  });
});
