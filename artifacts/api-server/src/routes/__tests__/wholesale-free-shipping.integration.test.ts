import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";

const fixture = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  return { ...real, db: new Proxy({}, {
    get: (_, key) => key === "transaction" ? (fn: any) => fn(fixture.tx)
      : (...args: any[]) => fixture.tx[key](...args),
  }) };
});
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => {
    if (req.headers["x-fixture-admin"] === "yes") return true;
    res.status(401).json({ error: "Unauthorized" }); return false;
  },
}));
vi.mock("../../middleware/require-wholesale", () => {
  const auth = (req: any, res: any, next: any) => {
    if (!req.headers["x-fixture-user"]) return res.status(401).json({ error: "Unauthorized" });
    req.wholesale = { telegramUsername: req.headers["x-fixture-user"] }; next();
  };
  return { requireWholesale: auth, requireWholesaleOrAdmin: auth };
});
vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn() }));

describe.skipIf(process.env.WHOLESALE_FREE_SHIPPING_DB_TESTS !== "1")("wholesale free shipping — rollback-only integration", () => {
  let store: any, database: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    database = (await vi.importActual<any>("@workspace/db")).db;
    const app = express(); app.use(express.json());
    app.use((await import("../config")).default);
    app.use((await import("../wholesale-shares")).default);
    server = await new Promise<Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  }, 30000);
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (store?.pool) await store.pool.end();
  });
  const put = async (id: string, body: unknown, admin = true) => {
    const response = await fetch(`${base}/admin/wholesale-vendors/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", ...(admin ? { "x-fixture-admin": "yes" } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  };
  it("requires Admin, persists and clears per-vendor settings, and rejects malformed values without changing other vendors", async () => {
    const rollback = new Error("rollback free-shipping settings");
    await expect(database.transaction(async (tx: any) => {
      fixture.tx = tx;
      const vendors = [
        { id: "fixture-one", name: "One", enabled: true, tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25, regions: [] },
        { id: "fixture-two", name: "Two", enabled: true, tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25, regions: [], freeShippingThreshold: 1000 },
      ];
      await tx.insert(store.siteConfigTable).values({ key: "wholesale_vendors", value: JSON.stringify(vendors) })
        .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: JSON.stringify(vendors) } });
      expect((await put("fixture-one", { freeShippingThreshold: 500 }, false)).status).toBe(401);
      expect((await put("fixture-one", { freeShippingThreshold: 500 })).body.freeShippingThreshold).toBe(500);
      // Editing ordinary vendor settings must not erase the offer.
      expect((await put("fixture-one", { name: "Renamed" })).body.freeShippingThreshold).toBe(500);
      for (const value of [0, -1, "500", 0.001]) {
        expect((await put("fixture-one", { freeShippingThreshold: value })).status).toBe(400);
      }
      const list = await fetch(`${base}/wholesale-vendors`).then(r => r.json()) as any;
      expect(list.vendors.find((v: any) => v.id === "fixture-one").freeShippingThreshold).toBe(500);
      expect(list.vendors.find((v: any) => v.id === "fixture-two").freeShippingThreshold).toBe(1000);
      expect((await put("fixture-one", { freeShippingThreshold: null })).body.freeShippingThreshold).toBeNull();
      throw rollback;
    })).rejects.toBe(rollback);
  }, 30000);

  it("quotes combined shared products per vendor and preserves the locked shipping snapshot after settings change", async () => {
    const rollback = new Error("rollback shared free-shipping fixture");
    await expect(database.transaction(async (tx: any) => {
      fixture.tx = tx;
      const vendorId = randomUUID(), id = randomUUID(), username = "free-shipping-fixture-owner";
      const vendor = { id: vendorId, name: "Fixture", enabled: true, tiers: ["1–25"], tierBounds: [25],
        maxKitsPerPackage: 25, freeShippingThreshold: 500, regions: [{ name: "UK", countries: ["GB"], prices: [60] }] };
      await tx.insert(store.siteConfigTable).values({ key: "wholesale_vendors", value: JSON.stringify([vendor]) })
        .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: JSON.stringify([vendor]) } });
      await tx.insert(store.wholesaleSharesTable).values({
        id, creatorUsername: username, vendorId, shippingCountry: "GB", status: "open",
      });
      const item = { productId: randomUUID(), productName: "Fixture", vendorId, quantity: 1, unitPrice: 250 };
      await tx.insert(store.wholesaleShareMembersTable).values([
        { id: randomUUID(), shareId: id, username, isCreator: true, items: [item] },
        { id: randomUUID(), shareId: id, username: "free-shipping-fixture-other", items: [item] },
      ]);
      const read = async () => {
        const response = await fetch(`${base}/wholesale-shares/${id}`, { headers: { "x-fixture-user": username } });
        expect(response.status).toBe(200);
        return response.json() as Promise<any>;
      };
      const open = await read();
      expect(open.shippingEstimate).toBe(0);
      expect(open.vendorShippingBreakdown[0].shipping).toBe(0);
      expect(open.members.map((m: any) => m.shippingShare)).toEqual([0, 0]);
      // Existing locked commitments are not recalculated from the new offer.
      await tx.update(store.wholesaleSharesTable).set({ status: "locked", totalVendorShipping: "60",
        vendorShippingBreakdown: [{ vendorId, vendorName: "Fixture", kits: 2, shipping: 60 }] })
        .where(eq(store.wholesaleSharesTable.id, id));
      await tx.update(store.wholesaleShareMembersTable).set({ shippingShare: "30",
        vendorShippingShares: [{ vendorId, vendorName: "Fixture", kits: 1, shipping: 30 }] })
        .where(eq(store.wholesaleShareMembersTable.shareId, id));
      const locked = await read();
      expect(locked.shippingEstimate).toBe(60);
      expect(locked.vendorShippingBreakdown[0].shipping).toBe(60);
      expect(locked.members.map((m: any) => m.shippingShare)).toEqual([30, 30]);
      throw rollback;
    })).rejects.toBe(rollback);
  }, 30000);
});
