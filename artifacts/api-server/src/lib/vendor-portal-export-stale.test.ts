import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", () => import("../../../../lib/db/src/schema"));
vi.mock("../routes/config", () => ({ getVendors: async () => [{
  id: "uther", name: "Uther", tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
  freeShippingThreshold: 1000,
  regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50] }],
}] }));
vi.mock("./fs3-cost-matches", () => ({ loadFs3CostMatches: async () => [] }));
vi.mock("./refund-mutation-guard", () => ({ assertNoActiveRefunds: vi.fn(), refundMutationPredicate: vi.fn() }));
import { ordersTable, orderLineItemsTable, productsTable, fs3CostsTable, vendorSubmissionsTable, wholesaleSharesTable, wholesaleShareMembersTable, wholesaleOrderFinancialsTable } from "@workspace/db";
import { prepareVendorShipments } from "./vendor-portal-service";
import { sourceFingerprint } from "./vendor-portal-model";
import { vendorSupplierCsv, vendorSupplierText } from "./vendor-supplier-export";

describe("FS3 download of orders with stale vendor submissions", () => {
  let order: any, item: any, submission: any, tx: any, share: any, cost: string | null;
  let otherOrder: any, otherItem: any, financials: any[];
  beforeEach(() => {
    share = null;
    otherOrder = null; otherItem = null; financials = [];
    cost = "10.00";
    order = { id: "order-a", code: "12731", orderType: "wholesale", sharedOrderId: null,
      wholesaleVendorId: "uther", groupBuyId: null, status: "Submitted", paymentStatus: "confirmed",
      shippingName: "Synthetic recipient", shippingAddress: "1 Synthetic Street",
      shippingCountry: "United Kingdom", shippingPhone: "000000000", shippingEmail: "" };
    item = { orderId: order.id, productId: "product-a", productName: "Synthetic 10mg", quantity: "3", vendorId: "uther" };
    const oldShipping = { name: order.shippingName, address: order.shippingAddress, country: order.shippingCountry, phone: order.shippingPhone, email: "" };
    submission = { id: "submission-a", vendorId: "uther", sourceKey: `order:${order.id}`,
      sourceFingerprint: sourceFingerprint({ items: [{ ...item, quantity: "2" }], shipping: oldShipping, orderIds: [order.id] }),
      reference: order.code, snapshot: { shipping: oldShipping, items: [{
        productName: item.productName, quantity: 2, unitCost: "10.00", lineTotal: "20.00",
      }], productCost: "20.00", shippingCost: "50.00", totalCost: "70.00", currency: "USD" },
      status: "Processing" };
    tx = { execute: vi.fn(async () => []), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
      select: (selection: any) => ({ from: (table: any) => {
        const rows = table === ordersTable ? (selection?.code ? [order] : [order, otherOrder].filter(Boolean)) : table === orderLineItemsTable ? [item, otherItem].filter(Boolean) :
          table === productsTable ? [{ id: item.productId, name: item.productName, wholesaleVendorId: "uther", wholesaleCost: cost }] :
          table === wholesaleSharesTable ? (share ? [share] : []) :
          table === wholesaleShareMembersTable ? [order, otherOrder].filter(Boolean).map(o => ({ orderId: o.id })) :
          table === wholesaleOrderFinancialsTable ? financials :
          table === fs3CostsTable ? [] : table === vendorSubmissionsTable ? (submission ? [submission] : []) : [];
        const query: any = { then: (resolve: any) => Promise.resolve(rows).then(resolve) };
        for (const method of ["where", "orderBy", "for"]) query[method] = () => query;
        return query;
      } }),
    };
  });
  it("downloads current quantities and costs without recalling or changing the submitted snapshot", async () => {
    const saved = structuredClone(submission);
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot.items[0].quantity).toBe(3);
    expect(rows[0].snapshot.totalCost).toBe("80.00");
    expect(vendorSupplierText(rows, "Uther")).toContain("Synthetic 10mg x3 = $30.00");
    expect(vendorSupplierCsv(rows, "Uther")).toContain("Synthetic 10mg");
    expect(submission).toEqual(saved);
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
  });
  it("still blocks stale actual vendor submission", async () => {
    await expect(prepareVendorShipments(tx, "uther", [order.code])).rejects.toThrow("This submission is stale");
  });
  it("waives supplier shipping once supplier products reach the vendor threshold", async () => {
    submission = null;
    cost = "12.50"; item.quantity = "100"; item.lineTotal = "1550.00";
    const [prepared] = await prepareVendorShipments(tx, "uther", [order.code]);
    expect(prepared.snapshot).toMatchObject({ productCost: "1250.00", shippingCost: "0.00", totalCost: "1250.00" });
    // Customer sales alone do not establish the supplier's purchase threshold.
    cost = "9.99";
    const [below] = await prepareVendorShipments(tx, "uther", [order.code]);
    expect(below.snapshot.shippingCost).toBe("200.00");
    cost = "10.00";
    const [exact] = await prepareVendorShipments(tx, "uther", [order.code]);
    expect(exact.snapshot.shippingCost).toBe("0.00");
  });
  it("freezes shared-member commercial sales at preparation, without backfilling an existing snapshot", async () => {
    submission = null;
    order.sharedOrderId = "shared-a"; order.orderType = "wholesale_shared";
    item.quantity = "1"; item.lineTotal = "50.00";
    otherOrder = { ...order, id: "order-b", code: "12732" };
    otherItem = { ...item, orderId: otherOrder.id };
    share = { ...order, id: "shared-a", vendorId: "uther", status: "submitted", organiserPaymentStatus: "confirmed" };
    financials = [order, otherOrder].map(o => ({ orderId: o.id, lines: [{
      productId: item.productId, productName: item.productName, quantity: "1", salesUsd: "50.00", vendorId: "uther", unitCost: "10.00",
    }] }));
    const [prepared] = await prepareVendorShipments(tx, "uther", [order.code]);
    expect(prepared.snapshot.productSales.orderLines).toEqual([
      { orderId: "order-a", vendorId: "uther", productName: "Synthetic 10mg", quantity: 1, salesUsd: "50.00" },
      { orderId: "order-b", vendorId: "uther", productName: "Synthetic 10mg", quantity: 1, salesUsd: "50.00" },
    ]);
    financials[0].lines[0].salesUsd = "60.00";
    financials[1].lines[0].salesUsd = "40.00";
    item.lineTotal = "60.00"; otherItem.lineTotal = "40.00";
    expect(prepared.snapshot.productSales.orderLines.map((line: any) => line.salesUsd)).toEqual(["50.00", "50.00"]);
    submission = { ...prepared, id: "existing" };
    delete submission.snapshot.productSales.orderLines;
    const [existing] = await prepareVendorShipments(tx, "uther", [order.code]);
    expect(existing.snapshot.productSales.orderLines).toBeUndefined();
    expect(tx.update).not.toHaveBeenCalled();
  });
  it("combines the same vendor's shared supplier costs for free shipping", async () => {
    submission = null;
    order.sharedOrderId = "shared-a"; order.orderType = "wholesale_shared";
    item.quantity = "50"; item.lineTotal = "775.00";
    otherOrder = { ...order, id: "order-b", code: "12732" };
    otherItem = { ...item, orderId: otherOrder.id };
    share = { ...order, id: "shared-a", vendorId: "uther", status: "submitted", organiserPaymentStatus: "confirmed" };
    financials = [order, otherOrder].map(o => ({ orderId: o.id, lines: [{
      productId: item.productId, productName: item.productName, quantity: "50", salesUsd: "775.00", vendorId: "uther", unitCost: "12.50",
    }] }));
    const [prepared] = await prepareVendorShipments(tx, "uther", [order.code]);
    expect(prepared.snapshot).toMatchObject({ productCost: "1250.00", shippingCost: "0.00", totalCost: "1250.00" });
  });
  it("preserves the committed snapshot when the order has not changed", async () => {
    item.quantity = "2";
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot).toEqual(submission.snapshot);
    expect(rows[0].alreadySubmitted).toBe(true);
  });
  it("does not let an export bypass vendor ownership", async () => {
    submission.vendorId = "another-vendor";
    await expect(prepareVendorShipments(tx, "uther", [order.code], "export")).rejects.toThrow("another vendor");
  });
  it("exports stale shared orders without requiring the organiser platform payment", async () => {
    order.sharedOrderId = "shared-a"; order.orderType = "wholesale_shared";
    share = { ...order, id: "shared-a", vendorId: "uther", status: "submitted", organiserPaymentStatus: "unpaid" };
    submission.sourceKey = "share:shared-a";
    const saved = structuredClone(submission);
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].sharedOrderId).toBe("shared-a");
    expect(rows[0].snapshot.items[0].quantity).toBe(3);
    expect(submission).toEqual(saved);
    expect(tx.delete).not.toHaveBeenCalled();
  });
  it("still rejects missing supplier costs instead of substituting customer prices", async () => {
    cost = null;
    submission.snapshot.items[0].unitCost = null;
    await expect(prepareVendorShipments(tx, "uther", [order.code], "export")).rejects.toThrow(/supplier costs/);
    expect(tx.update).not.toHaveBeenCalled();
  });
  it("uses an existing historical cost even when the current catalogue cost is blank", async () => {
    cost = null;
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot.items[0].unitCost).toBe("10.00");
    expect(tx.update).not.toHaveBeenCalled();
  });
  it.each(["unpaid", "pending", "confirmed"])("exports stale %s orders without payment or fulfilment writes", async paymentStatus => {
    order.paymentStatus = paymentStatus;
    order.amountDue = "5";
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot.items[0].quantity).toBe(3);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
