import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LedgerOrders, EMPTY_FILTERS } from "./LedgerOrders";
import { selectExportPage, toggleExportOne, type LedgerOrder } from "./model";

const order = (id: string, extra: Partial<LedgerOrder> = {}): LedgerOrder => ({
  id, reference: `REF-${id}`, status: "Submitted", stale: false, totalCost: "12.00",
  paymentId: null, ...extra,
});

it("shows the original order status beside its number separately from vendor fulfilment", () => {
  const html = ledgerMarkup([order("one", {
    sourceOrders: [{ id: "original", code: "12896", username: "member", status: "Shipped" }],
  } as Partial<LedgerOrder>)]);
  expect(html).toContain('data-testid="payment-source-status-original"');
  expect(html).toContain("Shipped");
  expect(html).toContain("Order status");
});

it("bounds the desktop order column without changing the mobile card layout", () => {
  const html = ledgerMarkup([order("wide")]);
  expect(html).toContain('class="pap-table pap-ledger-table"');
  expect(html).toMatch(/<colgroup[\s>]/);
  expect(html).toContain('class="pap-col-order"');
  const css = readFileSync(new URL("./payments.css", import.meta.url), "utf8");
  expect(css).toMatch(/\.pap-ledger-table\{[^}]*table-layout:fixed/);
  expect(css).toMatch(/\.pap-col-order\{width:190px\}/);
  expect(css).toMatch(/\.pap-ledger-table colgroup\{display:none\}/);
});

function ledgerMarkup(orders: LedgerOrder[], pageSize = 25) {
  return renderToStaticMarkup(createElement(LedgerOrders, {
    orders, visible: orders, filters: EMPTY_FILTERS, onFilters: () => {}, page: 1, onPage: () => {},
    selected: new Set<string>(), onSelected: () => {}, locked: false, note: null, onNote: () => {},
    onOpen: () => {}, activeId: null, pageSize, onExport: () => {}, onHistoricalPaid: () => {},
  }));
}

it("keeps export selection independent of supplier payment eligibility", () => {
  const paid = order("paid", { paymentId: "receipt-1", paymentState: "paid" });
  const stale = order("stale", { stale: true });
  const first = selectExportPage(new Set(), [paid, stale]);
  expect([...first.next]).toEqual(["paid", "stale"]);
  expect(toggleExportOne(first.next, paid).has("paid")).toBe(false);
});

it("shows fulfillment chips, FS3 actions, configurable pagination, and selectable paid rows", () => {
  const html = ledgerMarkup([
    order("paid", { paymentId: "receipt-1", paymentState: "paid" }),
    order("ship", { status: "Shipped" }),
  ], 50);
  expect(html).toContain("Submitted");
  expect(html).toContain("Processing");
  expect(html).toContain("Shipped");
  expect(html).toContain("Completed");
  expect(html).toContain("Download FS3 TXT");
  expect(html).toContain("Review processed orders as paid");
  expect(html).toContain("Rows per page");
  expect(html).toContain('data-testid="payment-order-paid"');
  expect(html).not.toContain('data-testid="payment-order-paid" disabled=""');
});
