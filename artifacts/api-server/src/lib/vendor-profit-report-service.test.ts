import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

vi.mock("@workspace/db", async () => ({ ...await import("@workspace/db/schema") }));
const state = vi.hoisted(() => ({ orders: new Map<string, any>() }));
vi.mock("./vendor-source-reads", () => ({ preloadVendorSources: async () => ({ orders: state.orders }) }));
vi.mock("./vendor-portal-service", () => ({ inspectVendorSubmission: async () => ({ source: null, stale: true }) }));
import { productRefundReviewOptions, reviewProductRefund, vendorProfitReport } from "./vendor-profit-report-service";

const submission = (id = "s1", vendorId = "v1") => ({
  id, vendorId, orderIds: ["o1", "o2"], sourceKey: `share:shared:vendor:${vendorId}`, reference: id,
  submittedAt: "2026-11-02T10:00:00Z", status: "Submitted", sourceFingerprint: "original",
  snapshot: { currency: "USD", productCost: "75.00", shippingCost: "10.00", totalCost: "85.00",
    items: [{ productName: "A", quantity: 2, unitCost: "37.50", lineTotal: "75.00" }],
    productSales: { currency: "USD", salesUsd: "100.00", lines: [{ productName: "A", quantity: 2, salesUsd: "100.00" }],
      orderLines: ["o1", "o2"].map(orderId => ({ orderId, vendorId, productName: "A", quantity: 1, salesUsd: "50.00" })),
    } },
});
let tables: Record<string, any[]>, writes: string[], selects: string[], tx: any;
const input = { note: "Reviewed member product evidence; shipping excluded.",
  allocations: [{ submissionId: "s1", productName: "A", quantity: 0.5, salesUsd: "25.00" }] };
beforeEach(() => {
  tables = {
    vendor_submissions: [submission(), submission("s2", "v2")],
    group_buy_refunds: [{ id: "r1", orderId: "o1", status: "completed", amountUsd: "80.00", completedAt: new Date("2026-11-03") }],
    vendor_audit: [],
    wholesale_order_financials: ["o1", "o2"].map(orderId => ({ orderId, lines: ["v1", "v2"].map(vendorId => ({
      productName: "A", vendorId, quantity: "1.00", salesUsd: "50.00",
    })) })),
  };
  writes = []; selects = [];
  state.orders = new Map([["o1", { id: "o1", status: "Cancelled", paymentStatus: "refunded" }], ["o2", { id: "o2", status: "Processing", paymentStatus: "confirmed" }]]);
  tx = {
    select: () => ({ from: (table: any) => {
      const name = getTableName(table); selects.push(name);
      const chain: any = { where: () => chain, for: () => chain,
        then: (resolve: any, reject: any) => Promise.resolve(structuredClone(tables[name] ?? [])).then(resolve, reject) };
      return chain;
    } }),
    execute: vi.fn(async () => { writes.push("lock"); }),
    insert: (table: any) => ({ values: async (row: any) => { const name = getTableName(table); writes.push(name); tables[name].push({ createdAt: new Date(), ...row }); } }),
  };
});
describe("persisted product refund review reporting", () => {
  it("previews without writes and confirms only an attributable immutable audit event", async () => {
    const original = structuredClone(tables);
    const preview = await reviewProductRefund(tx, "r1", input, "reviewer");
    expect(preview).toHaveProperty("reviewToken");
    expect(writes).toEqual(["lock"]);
    expect(tables).toEqual(original);
    const result = await reviewProductRefund(tx, "r1", { ...input, reviewToken: preview.reviewToken }, "reviewer");
    expect(result).toMatchObject({ ok: true });
    expect(writes).toEqual(["lock", "lock", "vendor_audit"]);
    expect(tables.vendor_audit[0]).toMatchObject({ actor: "reviewer", action: "product_refund_reviewed",
      details: { productRefundUsd: "25.00", nonProductRefundUsd: "55.00" } });
    expect(tables.vendor_submissions).toEqual(original.vendor_submissions);
    expect(tables.group_buy_refunds).toEqual(original.group_buy_refunds);
    expect(selects.some(name => name.includes("receipt"))).toBe(false);
  });
  it("re-includes reviewed completed refunds even when refund completion cancelled the source order", async () => {
    const before = await vendorProfitReport(tx, undefined, "2026-11-01", "2026-11-30");
    expect(before.summary).toMatchObject({ includedCount: 0, excludedCount: 2, refundExcludedCount: 2 });
    const preview = await reviewProductRefund(tx, "r1", input, "reviewer");
    await reviewProductRefund(tx, "r1", { ...input, reviewToken: preview.reviewToken }, "reviewer");
    const after = await vendorProfitReport(tx, undefined, "2026-11-01", "2026-11-30");
    expect(after.summary).toMatchObject({ includedCount: 2, excludedCount: 0, salesUsd: "175.00",
      costUsd: "150.00", profitUsd: "25.00", productRefundUsd: "25.00", refundCount: 2 });
    expect(after.adjustments.map(a => a.salesUsd)).toEqual(["25.00", "0.00"]);
    expect(after.refundReviews).toEqual([]);
    expect(after.adjustments[0].reviews[0]).toMatchObject({ reviewedBy: "reviewer", note: input.note });
  });
  it("rejects stale evidence, edited inputs and duplicate confirmations", async () => {
    const preview = await reviewProductRefund(tx, "r1", input, "reviewer");
    await expect(reviewProductRefund(tx, "r1", { ...input, note: "Different", reviewToken: preview.reviewToken }, "reviewer")).rejects.toThrow(/changed/i);
    tables.vendor_submissions[1].snapshot.productSales.lines[0].salesUsd = "110.00";
    tables.vendor_submissions[1].snapshot.productSales.salesUsd = "110.00";
    await expect(reviewProductRefund(tx, "r1", { ...input, reviewToken: preview.reviewToken }, "reviewer")).rejects.toThrow(/attribution|snapshot/i);
    tables.vendor_submissions[1] = submission("s2", "v2");
    await reviewProductRefund(tx, "r1", { ...input, reviewToken: preview.reviewToken }, "reviewer");
    await expect(reviewProductRefund(tx, "r1", { ...input, reviewToken: preview.reviewToken }, "reviewer")).rejects.toThrow(/already/i);
    expect(tables.vendor_audit).toHaveLength(1);
  });
  it("loads every linked vendor's member-specific evidence for the review", async () => {
    const options = await productRefundReviewOptions(tx, "r1");
    expect(options.submissions).toHaveLength(2);
    expect(options.submissions[0].lines).toEqual([{ orderId: "o1", productName: "A", quantity: 1, salesUsd: "50.00" }]);
    delete tables.vendor_submissions[0].snapshot.productSales.orderLines;
    const missing = await productRefundReviewOptions(tx, "r1");
    expect(missing.submissions[0].reason).toMatch(/attribution/i);
  });
  it("never reads mutable commercial lines after offsetting shared-member edits", async () => {
    tables.wholesale_order_financials[0].lines.forEach((line: any) => { line.salesUsd = "60.00"; });
    tables.wholesale_order_financials[1].lines.forEach((line: any) => { line.salesUsd = "40.00"; });
    const options = await productRefundReviewOptions(tx, "r1");
    expect(options.submissions[0].lines[0].salesUsd).toBe("50.00");
    await expect(reviewProductRefund(tx, "r1", { ...input,
      allocations: [{ ...input.allocations[0], quantity: 1, salesUsd: "60.00" }] }, "reviewer")).rejects.toThrow(/sales/i);
    expect(selects).not.toContain("wholesale_order_financials");
  });
  it("never lets one completed member hide another member's unexplained refunded payment", async () => {
    const preview = await reviewProductRefund(tx, "r1", input, "reviewer");
    await reviewProductRefund(tx, "r1", { ...input, reviewToken: preview.reviewToken }, "reviewer");
    state.orders.get("o2").paymentStatus = "refunded";
    const report = await vendorProfitReport(tx, undefined, "2026-11-01", "2026-11-30");
    expect(report.summary).toMatchObject({ includedCount: 0, excludedCount: 2 });
    expect(report.issues[0].reason).toMatch(/evidence/i);
  });
});
