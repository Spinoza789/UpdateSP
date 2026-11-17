import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", () => import("../../../../lib/db/src/schema"));
vi.mock("./vendor-portal-service", () => ({ auditVendor: vi.fn(), prepareVendorShipments: vi.fn() }));
vi.mock("./vendor-payments", () => ({ assertVendorSubmissionUnpaid: vi.fn() }));
import { editSupplierCosts } from "./vendor-payment-tools";
import { paymentReviewToken } from "./vendor-payment-ledger";
import { assertVendorSubmissionUnpaid } from "./vendor-payments";
import { auditVendor } from "./vendor-portal-service";

describe("reviewed shipping-only supplier correction", () => {
  beforeEach(() => vi.clearAllMocks());
  const fixture = () => {
    const row = { id: "s", vendorId: "v", status: "Submitted", sourceKey: "share:x", orderIds: ["o"],
      snapshot: { currency: "USD", productCostHistoryMissing: true, productCost: "10.00", shippingCost: "60.00", totalCost: "70.00",
        productSales: { currency: "USD", salesUsd: "15.00", lines: [] },
        items: [{ productName: "Weighted item", quantity: 3, unitCost: "3.33", lineTotal: "10.00" }] } };
    let saved: any;
    const tx: any = {
      select: () => ({ from: () => ({ where: () => ({ for: async () => [row] }) }) }),
      update: () => ({ set: (values: any) => ({ where: async () => { saved = values.snapshot; } }) }),
    };
    return { row, database: { transaction: (fn: any) => fn(tx) }, saved: () => saved,
      body: { vendorId: "v", shippingOnly: true, shippingCost: "0.00", note: "Supplier free shipping correction",
        reviewToken: paymentReviewToken(row), items: [{ productName: "Weighted item", unitCost: "3.33" }] } };
  };
  it("preserves historical lines, weighted totals, sales and missing-history evidence", async () => {
    const f = fixture();
    await editSupplierCosts("s", f.body, "admin", f.database);
    expect(f.saved()).toEqual({ ...f.row.snapshot, shippingCost: "0.00", totalCost: "10.00" });
    expect(auditVendor).toHaveBeenCalledOnce();
  });
  it("rejects changing product prices under a shipping-only correction", async () => {
    const f = fixture();
    f.body.items[0].unitCost = "99.00";
    await expect(editSupplierCosts("s", f.body, "admin", f.database)).rejects.toThrow(/product|shipping-only/i);
    expect(f.saved()).toBeUndefined();
  });
  it("cannot change an already paid supplier receipt", async () => {
    const f = fixture();
    vi.mocked(assertVendorSubmissionUnpaid).mockRejectedValueOnce(new Error("Already paid"));
    await expect(editSupplierCosts("s", f.body, "admin", f.database)).rejects.toThrow("Already paid");
    expect(f.saved()).toBeUndefined();
  });
  it("rejects a stale review and requires an audit note", async () => {
    const f = fixture();
    await expect(editSupplierCosts("s", { ...f.body, reviewToken: "stale" }, "admin", f.database)).rejects.toThrow(/changed|review/i);
    await expect(editSupplierCosts("s", { ...f.body, note: "" }, "admin", f.database)).rejects.toThrow(/note/i);
    expect(f.saved()).toBeUndefined();
    expect(auditVendor).not.toHaveBeenCalled();
  });
});
