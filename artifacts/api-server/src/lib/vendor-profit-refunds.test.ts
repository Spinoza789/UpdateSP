import { describe, expect, it } from "vitest";
import { buildProductRefundReview, productRefundState } from "./vendor-profit-refunds";

const submission = (id = "s1", vendorId = "v1", orderIds = ["o1", "o2"]) => ({
  id, vendorId, orderIds, status: "Submitted",
  snapshot: { productSales: { currency: "USD", salesUsd: "100.00", lines: [{ productName: "A", quantity: 2, salesUsd: "100.00" }],
    orderLines: orderIds.flatMap(orderId => [{ orderId, vendorId, productName: "A", quantity: 1, salesUsd: "50.00" }]),
  } },
});
const refund = { id: "r1", orderId: "o1", status: "completed", amountUsd: "80.00", completedAt: "2026-11-03T12:00:00Z" };
const allocation = { submissionId: "s1", productName: "A", quantity: 0.5, salesUsd: "25.00" };
const input = { note: "Reviewed product lines; remaining amount is postage and fees.", allocations: [allocation] };
const review = (extra = {}) => buildProductRefundReview(refund, [submission()], [], { ...input, ...extra });
const event = (details = review()) => ({ id: "a1", actor: "admin", createdAt: "2026-11-04", details });

describe("reviewed product-only refund attribution", () => {
  it("attributes a partial quantity without using the whole refund or changing evidence", () => {
    const row = submission(), original = structuredClone(row);
    const details = buildProductRefundReview(refund, [row], [], input);
    expect(details.productRefundUsd).toBe("25.00");
    expect(details.nonProductRefundUsd).toBe("55.00");
    expect(productRefundState(row, [refund], [event(details)], false)).toMatchObject({
      affected: true, reason: null, salesUsd: "25.00",
    });
    expect(row).toEqual(original);
  });
  it.each(["requested", "verifying", "verification_failed", "unknown"])("excludes %s without treating it as paid out", status => {
    expect(() => buildProductRefundReview({ ...refund, status }, [submission()], [], input)).toThrow(/completed/i);
    expect(productRefundState(submission(), [{ ...refund, status }], [], false).reason).toMatch(/active|unresolved/i);
  });
  it.each(["rejected", "cancelled", "canceled"])("ignores %s requests", status => {
    expect(productRefundState(submission(), [{ ...refund, status }], [], false)).toMatchObject({ affected: false, salesUsd: "0.00", reason: null });
  });
  it("keeps completed but unreviewed and unexplained refunded orders excluded", () => {
    expect(productRefundState(submission(), [refund], [], false).reason).toMatch(/review/i);
    expect(productRefundState(submission(), [], [], true).reason).toMatch(/evidence/i);
  });
  it("allocates a shared/mixed order only to explicitly reviewed suppliers", () => {
    const rows = [submission(), submission("s2", "v2")];
    const details = buildProductRefundReview(refund, rows, [], input);
    expect(productRefundState(rows[0], [refund], [event(details)], false).salesUsd).toBe("25.00");
    expect(productRefundState(rows[1], [refund], [event(details)], false).salesUsd).toBe("0.00");
    expect(details.allocations[0]).toMatchObject({ vendorId: "v1", orderId: "o1", quantity: 0.5 });
  });
  it("supports reviewed shipping-only refunds without reducing products", () => {
    expect(review({ allocations: [] })).toMatchObject({ productRefundUsd: "0.00", nonProductRefundUsd: "80.00" });
  });
  it("rejects missing attribution, duplicate lines, excess amounts and excess quantities", () => {
    for (const allocations of [
      [{ ...allocation, submissionId: "other" }], [allocation, allocation],
      [{ ...allocation, quantity: 3 }], [{ ...allocation, salesUsd: "81.00" }],
      [{ ...allocation, quantity: 0 }], [{ ...allocation, quantity: 0.001 }],
      [{ ...allocation, productName: "missing" }], [{ ...allocation, salesUsd: "-1.00" }],
    ]) expect(() => review({ allocations })).toThrow();
    expect(() => buildProductRefundReview(refund, [submission("s1", "v1", ["other"])], [], input)).toThrow();
    expect(() => review({ note: "" })).toThrow();
  });
  it("bounds cumulative refunds across different members by frozen quantity and sales", () => {
    const first = event(review({ allocations: [{ ...allocation, quantity: 1, salesUsd: "50.00" }] }));
    expect(() => buildProductRefundReview({ ...refund, id: "r2" }, [submission()], [first],
      { ...input, allocations: [{ ...allocation, quantity: 0.5, salesUsd: "10.00" }] })).toThrow(/quantity|sales/i);
  });
  it("rejects duplicate reviews and marks changed snapshots unavailable", () => {
    const first = event();
    expect(() => buildProductRefundReview(refund, [submission()], [first], input)).toThrow(/already/i);
    const changed = submission();
    changed.snapshot.productSales.lines[0].quantity = 3;
    expect(productRefundState(changed, [refund], [first], false).reason).toMatch(/changed|snapshot/i);
  });
  it("does not accept incomplete historical sales as attributable evidence", () => {
    const row: any = submission(); delete row.snapshot.productSales;
    expect(() => buildProductRefundReview(refund, [row], [], input)).toThrow(/historical|snapshot/i);
  });
  it("never attributes another shared member's products to the refunded member", () => {
    const row = submission();
    row.snapshot.productSales.orderLines = [
      { orderId: "o1", vendorId: "v1", productName: "A", quantity: 0.5, salesUsd: "20.00" },
      { orderId: "o2", vendorId: "v1", productName: "A", quantity: 1.5, salesUsd: "80.00" },
    ];
    expect(() => buildProductRefundReview(refund, [row], [], input)).toThrow(/sales/i);
    expect(() => buildProductRefundReview(refund, [row], [],
      { ...input, allocations: [{ ...allocation, quantity: 1, salesUsd: "20.00" }] })).toThrow(/quantity/i);
  });
  it("keeps shared historical orders without member attribution unavailable", () => {
    const row: any = submission(); delete row.snapshot.productSales.orderLines;
    expect(() => buildProductRefundReview(refund, [row], [], input)).toThrow(/attribution/i);
  });
  it("returns an actionable validation error for invalid money instead of a server error", () => {
    try { review({ allocations: [{ ...allocation, salesUsd: "oops" }] }); }
    catch (error) { expect(error).toMatchObject({ status: 409 }); return; }
    throw new Error("Expected invalid money to be rejected.");
  });
  it("ignores offsetting post-submission member edits that preserve the shipment total", () => {
    const row: any = submission();
    // This is today's mutable commercial cache, not evidence of what was submitted.
    row.refundOrderSales = [
      { orderId: "o1", vendorId: "v1", productName: "A", quantity: 1, salesUsd: "60.00" },
      { orderId: "o2", vendorId: "v1", productName: "A", quantity: 1, salesUsd: "40.00" },
    ];
    expect(() => buildProductRefundReview(refund, [row], [],
      { ...input, allocations: [{ ...allocation, quantity: 1, salesUsd: "60.00" }] })).toThrow(/sales/i);
    const details = buildProductRefundReview(refund, [row], [], input);
    delete row.refundOrderSales;
    expect(productRefundState(row, [refund], [event(details)], false).reason).toBeNull();
  });
  it("does not reconstruct missing member history from offsetting current sales", () => {
    const row: any = submission();
    delete row.snapshot.productSales.orderLines;
    row.refundOrderSales = [
      { orderId: "o1", vendorId: "v1", productName: "A", quantity: 1, salesUsd: "60.00" },
      { orderId: "o2", vendorId: "v1", productName: "A", quantity: 1, salesUsd: "40.00" },
    ];
    expect(() => buildProductRefundReview(refund, [row], [], input)).toThrow(/attribution/i);
  });
});
