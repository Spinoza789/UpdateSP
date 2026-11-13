import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
vi.mock("../routes/config", () => {
  const vendors = [{ id: "synthetic-uther", name: "Uther", enabled: true,
    tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25,
    regions: [{ name: "Italy", countries: ["Italy"], prices: [60] }] }];
  return { getVendors: async () => vendors, getEnabledWholesaleVendors: async () => vendors,
    getActiveWholesaleVendor: async () => vendors[0] };
});
vi.mock("./telegram", () => ({ notifyUserFull: vi.fn(), sendAdminMessageFull: vi.fn() }));

describe.skipIf(process.env.SUPPLIER_BATCH_DB_TESTS !== "1")("batch wholesale / real PostgreSQL", () => {
  const cleanup: { groupId: string; products: string[]; orderIds: string[] }[] = [];
  afterEach(async () => {
    const s = await import("@workspace/db");
    for (const f of cleanup.splice(0)) await s.db.transaction(async tx => {
      await tx.delete(s.gbSupplierAllocationsTable).where(inArray(s.gbSupplierAllocationsTable.orderId, f.orderIds));
      await tx.delete(s.gbSupplierEventsTable).where(eq(s.gbSupplierEventsTable.groupBuyId, f.groupId));
      await tx.delete(s.gbSupplierBatchesTable).where(eq(s.gbSupplierBatchesTable.groupBuyId, f.groupId));
      await tx.delete(s.ordersTable).where(inArray(s.ordersTable.id, f.orderIds));
      await tx.delete(s.auditLogsTable).where(sql`${s.auditLogsTable.metadata}->>'groupBuyId' = ${f.groupId}`);
      await tx.delete(s.productsTable).where(inArray(s.productsTable.id, f.products));
      await tx.delete(s.groupBuysTable).where(eq(s.groupBuysTable.id, f.groupId));
    });
  });
  async function fixture() {
    const s = await import("@workspace/db"), api = await import("./supplier-batches");
    const id = randomUUID(), source = randomUUID(), catalogue = randomUUID(), member = randomUUID();
    cleanup.push({ groupId: id, products: [source, catalogue], orderIds: [member] });
    const actor = { username: "synthetic-batch-organiser", admin: false };
    await s.db.insert(s.groupBuysTable).values({ id, name: "Uther synthetic conversion test", organiserId: actor.username, status: "draft", currency: "USD" });
    await api.saveSupplierConfig(id, actor, { expectedVersion: 0,
      config: { enabled: true, telegramAlerts: false, regions: [{ id: "it", name: "Italy", countries: ["IT"], targetKits: 2 }] } });
    const name = `Synthetic compound ${id}`;
    await s.db.insert(s.productsTable).values([
      { id: source, name, vendor: "Uther", price: "10", sourceGroupBuyId: id },
      { id: catalogue, name, vendor: "Uther", wholesaleVendorId: "synthetic-uther", price: "90", wholesalePrice: "80" },
    ]);
    await s.db.insert(s.ordersTable).values({ id: member, code: `synthetic-${id}`, telegramUsername: "synthetic-batch-member",
      groupBuyId: id, deliveryMethod: "Synthetic", shippingCountry: "Italy", paymentStatus: "confirmed",
      paymentConfirmedAt: new Date(), productSubtotal: "20", grandTotal: "20" });
    await s.db.insert(s.orderLineItemsTable).values({ id: randomUUID(), orderId: member, productId: source,
      productName: name, quantity: "2", unitPrice: "10", lineTotal: "20" });
    const data = await api.supplierData(id, actor);
    const prepared = await api.confirmSupplierBatch(id, actor, { regionId: "it", token: data.proposals[0].token });
    return { s, id, member, actor, batchId: prepared.batches[0].id, cleanup: cleanup.at(-1)! };
  }
  it("serializes double clicks to one linked unpaid order and leaves member money unchanged", async () => {
    const f = await fixture(), service = await import("./supplier-batch-wholesale");
    const p = await service.previewBatchWholesale(f.id, f.batchId, f.actor, "Italy");
    const before = await f.s.db.select().from(f.s.ordersTable).where(eq(f.s.ordersTable.id, f.member));
    const input = { groupBuyId: f.id, batchId: f.batchId, token: p.token };
    async function create() {
      return f.s.db.transaction(async tx => {
        await service.lockBatchWholesaleCheckout(tx, input, f.actor.username, p.lineItems!, "Italy", p.vendorId!, 60);
        const id = randomUUID(); f.cleanup.orderIds.push(id);
        const [order] = await tx.insert(f.s.ordersTable).values({ id, code: `synthetic-${id}`, telegramUsername: f.actor.username,
          orderType: "wholesale", wholesaleVendorId: p.vendorId, deliveryMethod: "Vendor Shipping",
          productSubtotal: "160", vendorShipping: "60", grandTotal: "220", paymentStatus: "unpaid" }).returning();
        await tx.insert(f.s.orderLineItemsTable).values(p.lineItems!.map(i => ({ id: randomUUID(), orderId: id,
          productId: i.productId, productName: i.productName, quantity: String(i.quantity),
          unitPrice: String(i.unitPrice), lineTotal: String(i.lineTotal) })));
        await service.commitBatchWholesaleCheckout(tx, input, order, f.actor.username);
        return order;
      });
    }
    const results = await Promise.allSettled([create(), create()]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const failure = results.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ orderId: expect.any(String) });
    const after = await f.s.db.select().from(f.s.ordersTable).where(eq(f.s.ordersTable.id, f.member));
    expect(after).toEqual(before);
    const linked = await service.previewBatchWholesale(f.id, f.batchId, f.actor, "Italy");
    expect(linked.linkedOrder.id).toBe(failure.reason.orderId);
    const [order] = await f.s.db.select().from(f.s.ordersTable).where(eq(f.s.ordersTable.id, linked.linkedOrder.id));
    expect(order).toMatchObject({ paymentStatus: "unpaid", orderType: "wholesale", grandTotal: "220.00" });
  }, 20_000);
  it("rolls back the order link and batch commitment if creation fails", async () => {
    const f = await fixture(), service = await import("./supplier-batch-wholesale");
    const p = await service.previewBatchWholesale(f.id, f.batchId, f.actor, "Italy");
    const input = { groupBuyId: f.id, batchId: f.batchId, token: p.token };
    await expect(f.s.db.transaction(async tx => {
      await service.lockBatchWholesaleCheckout(tx, input, f.actor.username, p.lineItems!, "Italy", p.vendorId!, 60);
      await service.commitBatchWholesaleCheckout(tx, input, { id: "rolled-back", code: "rolled-back" }, f.actor.username);
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    const again = await service.previewBatchWholesale(f.id, f.batchId, f.actor, "Italy");
    expect(again.linkedOrder).toBeNull();
    expect(again.token).toBe(p.token);
  }, 20_000);
});
