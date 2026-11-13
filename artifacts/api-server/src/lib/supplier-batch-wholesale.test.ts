import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  state: vi.fn(), supplierAccess: vi.fn(), lock: vi.fn(), catalogue: [] as any[], linked: null as any,
}));
vi.mock("@workspace/db", () => import("../../../../lib/db/src/schema/index"));
vi.mock("./supplier-batches", () => ({ state: mocks.state, supplierAccess: mocks.supplierAccess,
  locked: async (_id: string, _actor: any, fn: any) => fn(tx(), group) }));
vi.mock("./half-kit-lock", () => ({ lockHalfKitMoney: mocks.lock }));
const vendor = { id: "uther", name: "Uther", enabled: true, tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25,
  regions: [{ name: "Italy", countries: ["Italy"], prices: [60] }], freeShippingThreshold: 1000 };
vi.mock("../routes/config", () => ({
  getVendors: async () => [vendor], getEnabledWholesaleVendors: async () => [vendor],
}));
import { gbSupplierEventsTable, productsTable } from "@workspace/db";
import { buildBatchWholesalePreview, lockBatchWholesaleCheckout, commitBatchWholesaleCheckout } from "./supplier-batch-wholesale";
const group = { id: "g", name: "Uther GB", organiserId: "@organiser" };
const item = { productId: "gb-product", productName: "Reta 10mg", quantity: 2 };
const batch = () => ({ id: "b", reference: "EU-001", state: "prepared", exceptions: [], snapshot: {
  // Stale aggregate deliberately disagrees: only the allocated items count.
  products: [{ ...item, quantity: 99 }], orders: [{ id: "member-order", items: [item] }],
} });
function tx() {
  return {
    select: () => ({ from: (table: any) => {
      const result = table === productsTable ? mocks.catalogue : table === gbSupplierEventsTable && mocks.linked
        ? [{ detail: { wholesaleOrder: mocks.linked } }] : [];
      return { where: () => Object.assign(Promise.resolve(result), { for: async () => result }) };
    } }),
    insert: vi.fn(() => ({ values: vi.fn(async () => {}) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })),
  };
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.linked = null; mocks.state.mockResolvedValue({ batches: [batch()] }); mocks.supplierAccess.mockResolvedValue(group);
  mocks.catalogue = [{ id: "wh-product", name: "Reta 10mg", wholesalePrice: "80", price: "90", wholesaleVendorId: "uther" }];
});
describe("Uther batch wholesale checkout safeguards", () => {
  it("quotes allocated quantities, current selling prices and vendor shipping", async () => {
    const p = await buildBatchWholesalePreview(tx(), group, "b", "IT");
    expect(p).toMatchObject({ vendorId: "uther", kits: 2, productSubtotal: 160, vendorShipping: 60, grandTotal: 220, shippingCountry: "Italy" });
    expect(p.lineItems?.[0]).toMatchObject({ quantity: 2, unitPrice: 80 });
  });
  it("applies vendor free-shipping thresholds to the combined subtotal", async () => {
    mocks.catalogue[0].wholesalePrice = "600";
    expect(await buildBatchWholesalePreview(tx(), group, "b", "Italy")).toMatchObject({ productSubtotal: 1200, vendorShipping: 0, grandTotal: 1200 });
  });
  it("rejects other groups, submitted batches, released batches and exceptions", async () => {
    await expect(buildBatchWholesalePreview(tx(), { ...group, name: "Other" }, "b", "Italy")).rejects.toThrow(/Uther/);
    for (const state of ["ordered", "released"]) {
      mocks.state.mockResolvedValue({ batches: [{ ...batch(), state }] });
      await expect(buildBatchWholesalePreview(tx(), group, "b", "Italy")).rejects.toThrow(/prepared/);
    }
    mocks.state.mockResolvedValue({ batches: [{ ...batch(), exceptions: [{ reason: "Unpaid" }] }] });
    await expect(buildBatchWholesalePreview(tx(), group, "b", "Italy")).rejects.toThrow(/exceptions/);
  });
  it("does not guess shipping for unknown destinations", async () => {
    expect(await buildBatchWholesalePreview(tx(), group, "b", "Mars")).toMatchObject({ vendorShipping: null, grandTotal: null });
  });
  it("returns the existing order without recomputing a second purchase", async () => {
    mocks.linked = { id: "original", code: "123" };
    mocks.catalogue = [];
    expect(await buildBatchWholesalePreview(tx(), group, "b", "Italy")).toEqual({ linkedOrder: mocks.linked });
  });
  it("takes the transactional money lock and rejects changed quantities or prices", async () => {
    const p = await buildBatchWholesalePreview(tx(), group, "b", "Italy");
    const input = { groupBuyId: "g", batchId: "b", token: p.token };
    await lockBatchWholesaleCheckout(tx(), input, "@organiser", p.lineItems!, "Italy", "uther", 60);
    expect(mocks.lock).toHaveBeenCalledWith(expect.anything(), "g");
    await expect(lockBatchWholesaleCheckout(tx(), input, "@organiser", [{ ...p.lineItems![0], quantity: 3 }], "Italy", "uther", 60)).rejects.toThrow(/changed/);
    mocks.catalogue[0].wholesalePrice = "81";
    await expect(lockBatchWholesaleCheckout(tx(), input, "@organiser", p.lineItems!, "Italy", "uther", 60)).rejects.toThrow(/changed/);
  });
  it("blocks another organiser, unsupported shipping and duplicate creation", async () => {
    const p = await buildBatchWholesalePreview(tx(), group, "b", "Italy");
    const input = { groupBuyId: "g", batchId: "b", token: p.token };
    await expect(lockBatchWholesaleCheckout(tx(), input, "@other", p.lineItems!, "Italy", "uther", 60)).rejects.toThrow(/organiser/);
    await expect(lockBatchWholesaleCheckout(tx(), input, "@organiser", p.lineItems!, "Mars", "uther", 60)).rejects.toThrow(/changed/);
    mocks.linked = { id: "original", code: "123" };
    await expect(lockBatchWholesaleCheckout(tx(), input, "@organiser", p.lineItems!, "Italy", "uther", 60)).rejects.toMatchObject({ orderId: "original" });
  });
  it("commits provenance and the batch without updating member orders or payments", async () => {
    const t = tx();
    await commitBatchWholesaleCheckout(t, { groupBuyId: "g", batchId: "b" }, { id: "new", code: "123" }, "@organiser");
    expect(t.insert).toHaveBeenCalledTimes(1);
    expect(t.update).toHaveBeenCalledTimes(1);
  });
});
