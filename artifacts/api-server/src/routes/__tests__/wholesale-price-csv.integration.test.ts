import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";

const fixture = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  return { ...real, db: { transaction: (fn: any) => fn(fixture.tx) } };
});
vi.mock("../../middleware/require-admin", () => ({ requireAdmin: (req: any, res: any) => {
  if (req.headers["x-fixture-admin"] === "yes") return true;
  res.status(401).json({ error: "Unauthorized" }); return false;
} }));
describe.skipIf(process.env.WHOLESALE_CSV_DB_TESTS !== "1")("wholesale price CSV — rollback-only PostgreSQL integration", () => {
  let store: any, database: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    database = (await vi.importActual<any>("@workspace/db")).db;
    const app = express(); app.use(express.json({ limit: "2mb" }));
    app.use((await import("../wholesale-price-csv")).default);
    server = await new Promise<Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as any).port}/admin/wholesale-products/price-csv`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (store?.pool) await store.pool.end();
  });
  const post = async (body: any, admin = true) => {
    const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json",
      ...(admin ? { "x-fixture-admin": "yes" } : {}) }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() as any };
  };
  it("requires Admin for export and import, and a preview token for applying", async () => {
    expect((await fetch(`${base}?vendorId=test`)).status).toBe(401);
    expect((await post({ vendorId: "test", csv: "", apply: false }, false)).status).toBe(401);
    expect((await post({ vendorId: "test", csv: "", apply: true })).status).toBe(400);
  });
  it("exports complete supplier lists and atomically updates only prices after preview, preserving orders and other product fields", async () => {
    const rollback = new Error("rollback synthetic CSV fixtures");
    await expect(database.transaction(async (tx: any) => {
      fixture.tx = tx;
      const vendorId = randomUUID(), a = randomUUID(), b = randomUUID(), other = randomUUID(), archived = randomUUID(), orderId = randomUUID();
      await tx.insert(store.siteConfigTable).values({ key: "wholesale_vendors", value: JSON.stringify([
        { id: vendorId, name: "Synthetic CSV supplier", legacyCatalogueVendor: "synthetic-csv" },
        { id: "elsewhere", name: "Elsewhere" },
      ]) }).onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: JSON.stringify([
        { id: vendorId, name: "Synthetic CSV supplier", legacyCatalogueVendor: "synthetic-csv" },
        { id: "elsewhere", name: "Elsewhere" },
      ]) } });
      await tx.insert(store.productsTable).values([
        { id: a, name: 'CSV, "first"', price: "40", wholesaleVendorId: vendorId, wholesalePrice: null, wholesaleCost: null, stock: 17, wholesaleEnabled: false },
        { id: b, name: "CSV legacy", vendor: "synthetic-csv", price: "40", wholesalePrice: "25", wholesaleCost: "10", stock: 21, wholesaleEnabled: true },
        { id: other, name: "Other supplier", price: "40", wholesaleVendorId: "elsewhere", wholesalePrice: "30", wholesaleCost: "12" },
        { id: archived, name: "Archived supplier product", price: "40", wholesaleVendorId: vendorId, active: false },
      ]);
      await tx.insert(store.ordersTable).values({ id: orderId, code: "synthetic-csv-order", telegramUsername: "synthetic-csv-member",
        deliveryMethod: "Wholesale", grandTotal: "50", productSubtotal: "50", paymentStatus: "confirmed", routingType: "wholesale" });
      await tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId, productId: b, productName: "CSV legacy", quantity: "2", unitPrice: "25", lineTotal: "50" });
      const orderBefore = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, orderId));
      const linesBefore = await tx.select().from(store.orderLineItemsTable).where(eq(store.orderLineItemsTable.orderId, orderId));
      const productsBefore = await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, [a, b, other]));
      const downloaded = await fetch(`${base}?vendorId=${vendorId}`, { headers: { "x-fixture-admin": "yes" } });
      expect(downloaded.status).toBe(200);
      expect(downloaded.headers.get("content-type")).toContain("text/csv");
      const file = await downloaded.text();
      expect(file).toContain(a); expect(file).toContain(b);
      expect(file).not.toContain(other); expect(file).not.toContain(archived);
      expect((await post({ vendorId, csv: file, apply: false })).body).toMatchObject({ rows: 2, unchanged: 2, changes: [] });
      const csv = `Product ID,Product name,Supplier cost (USD),Selling price (USD)\n${a},First,7,20\n${b},Legacy,,30`;
      const body = { vendorId, csv, apply: false };
      const review = await post(body);
      expect(review.status).toBe(200); expect(review.body.changes).toHaveLength(2);
      expect(await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, [a, b, other]))).toEqual(productsBefore);
      // The file cannot be edited between review and Apply.
      expect((await post({ ...body, csv: csv.replace(",7,20", ",8,20"), apply: true, previewToken: review.body.previewToken })).status).toBe(409);
      // All rows must validate before any row is written, including valid rows preceding a foreign supplier's row.
      expect((await post({ ...body, csv: `${csv}\n${other},Other,1,2` })).status).toBe(400);
      expect(await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, [a, b, other]))).toEqual(productsBefore);
      const applied = await post({ ...body, apply: true, previewToken: review.body.previewToken });
      expect(applied.status).toBe(200); expect(applied.body).toMatchObject({ applied: true, updated: 2 });
      const after = await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, [a, b, other]));
      expect(after.find((p: any) => p.id === a)).toMatchObject({ wholesaleCost: "7.00", wholesalePrice: "20.00", stock: 17, wholesaleEnabled: false, wholesaleVendorId: vendorId, price: "40.00" });
      expect(after.find((p: any) => p.id === b)).toMatchObject({ wholesaleCost: "10.00", wholesalePrice: "30.00", stock: 21 });
      expect(after.find((p: any) => p.id === other)).toEqual(productsBefore.find((p: any) => p.id === other));
      expect(await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, orderId))).toEqual(orderBefore);
      expect(await tx.select().from(store.orderLineItemsTable).where(eq(store.orderLineItemsTable.orderId, orderId))).toEqual(linesBefore);
      // A second stale Apply cannot overwrite later catalogue edits.
      expect((await post({ ...body, apply: true, previewToken: review.body.previewToken })).status).toBe(409);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
