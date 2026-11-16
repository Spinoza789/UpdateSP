import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ReportBody, isReport, type ProfitReport } from "./RevenueProfitReport";

const sum = { salesUsd: "1200.50", costUsd: "700.25", profitUsd: "300.25", marginPercent: "30.0251", matchedSalesUsd: "1000.00", totalCount: 9, includedCount: 6, excludedCount: 2, unavailableCount: 1, refundCount: 1 };
const report: ProfitReport = {
  currency: "USD", timeZone: "Europe/London", dateBasis: "supplier_submission", from: "2025-03-01", to: "2025-03-31",
  summary: sum,
  periods: [{ date: "2025-03-04", ...sum }, { date: "2025-03-05", ...sum, marginPercent: null, profitUsd: "-5.00" }],
  issues: [{ id: "s1", reference: "PA-101", vendorId: "v1", reason: "Historical supplier cost unknown" }],
};

it("validates the report envelope", () => {
  expect(isReport(report)).toBe(true);
  expect(isReport({ summary: {} })).toBe(false);
  expect(isReport({ ...report, summary: { ...sum, includedCount: undefined } })).toBe(false);
  expect(isReport({ ...report, periods: [{ date: "2025-03-01" }] })).toBe(false);
});
it("shows revenue, matched sales, cost, profit and margin", () => {
  const html = renderToStaticMarkup(createElement(ReportBody, { report, showDaily: false }));
  expect(html).toContain("$1,200.50");
  expect(html).toContain("$1,000.00");
  expect(html).toContain("$700.25");
  expect(html).toContain("$300.25");
  expect(html).toContain("30.03%");
  expect(html).toContain("supplier submission date");
  expect(html).not.toContain("2025-03-04");
});
it("flags excluded, refund and unknown rows explicitly", () => {
  const html = renderToStaticMarkup(createElement(ReportBody, { report, showDaily: false }));
  expect(html).toContain("PA-101");
  expect(html).toContain("Historical supplier cost unknown");
  expect(html).toMatch(/Refund affected/);
  expect(html).toMatch(/Excluded/);
});
it("renders daily breakdown with unavailable margins", () => {
  const html = renderToStaticMarkup(createElement(ReportBody, { report, showDaily: true }));
  expect(html).toContain("2025-03-04");
  expect(html).toContain("-$5.00");
  expect(html).toContain("Unavailable");
});
it("shows missing history as unavailable rather than zero profit", () => {
  const html = renderToStaticMarkup(createElement(ReportBody, { report: { ...report, summary: {
    ...sum, includedCount: 0, unavailableCount: 1, salesUsd: "0.00", costUsd: "0.00", profitUsd: "0.00", marginPercent: null,
  } }, showDaily: false }));
  expect(html).toContain("Partial historical data");
  expect(html.match(/Unavailable/g)?.length).toBe(3);
  expect(html).toContain("unknown costs are not zero");
});
it("shows reviewed refunds separately from excluded refunds without negative counts", () => {
  const html = renderToStaticMarkup(createElement(ReportBody, { report: { ...report,
    summary: { ...sum, excludedCount: 0, refundCount: 2, refundExcludedCount: 0, productRefundUsd: "40.00" },
    adjustments: [{ submissionId: "s1", reference: "PA-101", vendorId: "v1", affected: true, salesUsd: "40.00", reason: null,
      reviews: [{ refundId: "r1", reviewedBy: "reviewer", reviewedAt: "2026-11-04", productRefundUsd: "40.00", note: "Products only" }] }],
  }, showDaily: false }));
  expect(html).toContain("Product refunds applied");
  expect(html).toContain("$40.00");
  expect(html).toContain("reviewer");
  expect(html).not.toContain(">-2<");
  expect(html).toContain("Supplier costs remain unchanged");
});
