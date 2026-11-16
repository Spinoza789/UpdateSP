import { describe, expect, it } from "vitest";
import { aggregateProfitReport, londonReportRange } from "./vendor-profit-report";

const row = (id: string, sales = "100.00", profit = "25.00", extra = {}) => ({
  id, vendorId: "v1", reference: id, submittedAt: "2026-11-02T10:00:00Z", status: "Submitted",
  profit: { salesUsd: sales, amountUsd: profit, supplierProductsUsd: "75.00" }, ...extra,
});
describe("London product profit reporting", () => {
  it("includes the complete local end date across both DST changes", () => {
    const spring = londonReportRange("2026-03-29", "2026-03-29");
    expect(spring.start.toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(spring.end.toISOString()).toBe("2026-03-29T23:00:00.000Z");
    const autumn = londonReportRange("2026-10-25", "2026-10-25");
    expect(autumn.start.toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(autumn.end.toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
  it("rejects impossible dates, inverted ranges, and oversized requests", () => {
    for (const [from, to] of [["2026-02-30", "2026-03-01"], ["2026-12-01", "2026-01-01"], ["1900-01-01", "2100-01-01"]]) {
      expect(() => londonReportRange(from, to)).toThrow();
    }
  });
  it("uses weighted margin, deduplicates submissions and never counts receipts as sales", () => {
    const rows = [row("a"), row("b", "900.00", "90.00", { profit: { salesUsd: "900.00", amountUsd: "90.00", supplierProductsUsd: "810.00" } })];
    const report = aggregateProfitReport([...rows, rows[0]], "2026-11-01", "2026-11-30");
    expect(report.summary).toMatchObject({ salesUsd: "1000.00", profitUsd: "115.00", marginPercent: "11.50", includedCount: 2, totalCount: 2 });
    expect(report.periods[0].profitUsd).toBe("115.00");
  });
  it("counts unknown and refund-affected rows separately without inventing zero costs", () => {
    const report = aggregateProfitReport([
      row("ok"), row("unknown", "200.00", null as any, { profit: { salesUsd: "200.00", amountUsd: null, supplierProductsUsd: null } }),
      row("cancelled", "100.00", "25.00", { status: "Cancelled" }),
      row("refund", "100.00", "25.00", { refundAffected: true }),
    ], "2026-11-01", "2026-11-30");
    expect(report.summary).toMatchObject({ salesUsd: "300.00", matchedSalesUsd: "100.00", costUsd: "75.00", profitUsd: "25.00",
      includedCount: 1, unavailableCount: 1, refundCount: 1, excludedCount: 2, totalCount: 4 });
    expect(report.issues).toHaveLength(3);
  });
  it("uses London day buckets and excludes dates outside the requested period", () => {
    const report = aggregateProfitReport([row("a", "100.00", "25.00", { submittedAt: "2026-06-30T23:30:00Z" }), row("old")], "2026-07-01", "2026-07-01");
    expect(report.periods[0].date).toBe("2026-07-01");
    expect(report.summary.totalCount).toBe(1);
  });
  it("preserves negative profits and zero-sales margin as unavailable", () => {
    const report = aggregateProfitReport([row("loss", "0.00", "-75.00")], "2026-11-01", "2026-11-30");
    expect(report.summary).toMatchObject({ profitUsd: "-75.00", marginPercent: null });
  });
  it("subtracts reviewed product refunds from sales, retaining incurred supplier costs", () => {
    const original = row("partial", "100.00", "25.00", {
      refundAffected: true, refundAdjustment: { salesUsd: "40.00", reason: null },
    });
    const report = aggregateProfitReport([original], "2026-11-01", "2026-11-30");
    expect(report.summary).toMatchObject({ salesUsd: "60.00", matchedSalesUsd: "60.00", costUsd: "75.00",
      profitUsd: "-15.00", marginPercent: "-25.00", includedCount: 1, excludedCount: 0, refundCount: 1,
      refundExcludedCount: 0, productRefundUsd: "40.00" });
    expect(report.periods[0].productRefundUsd).toBe("40.00");
    expect(original.profit.salesUsd).toBe("100.00");
  });
  it("rejects invalid or excessive adjustments without leaking unadjusted sales", () => {
    for (const salesUsd of ["101.00", "-1.00", "bad"]) {
      const report = aggregateProfitReport([row("bad", "100.00", "25.00", {
        refundAffected: true, refundAdjustment: { salesUsd, reason: null },
      })], "2026-11-01", "2026-11-30");
      expect(report.summary).toMatchObject({ salesUsd: "0.00", excludedCount: 1, refundExcludedCount: 1 });
    }
  });
  it("retains the full supplier loss and a null margin after all product revenue is refunded", () => {
    const report = aggregateProfitReport([row("full", "100.00", "25.00", {
      refundAffected: true, refundAdjustment: { salesUsd: "100.00", reason: null },
    })], "2026-11-01", "2026-11-30");
    expect(report.summary).toMatchObject({ salesUsd: "0.00", costUsd: "75.00",
      profitUsd: "-75.00", marginPercent: null, includedCount: 1, productRefundUsd: "100.00" });
  });
});
