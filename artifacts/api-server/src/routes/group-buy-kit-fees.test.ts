import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { PgDialect } from "drizzle-orm/pg-core";

const state = vi.hoisted(() => ({
  groupExists: true,
  fullRule: false,
  ids: ["p1", "p2"],
  statements: [] as Array<{ sql: string; params: unknown[] }>,
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const tx = {
    select() {
      const query: any = {
        from() { return query; }, where() { return query; }, for() { return query; },
        then(resolve: any, reject: any) { return Promise.resolve(state.groupExists ? [{ id: "G" }] : []).then(resolve, reject); },
      };
      return query;
    },
    async execute(sql: any) {
      const statement = new PgDialect().sqlToQuery(sql);
      state.statements.push(statement);
      if (statement.sql.includes("SELECT product_id")) return { rows: state.ids.map(id => ({ id })) };
      if (statement.sql.includes("UPDATE group_buy_products")) {
        if (statement.sql.includes("charge_full_fee_on_half_kit =")) {
          state.fullRule = statement.params[statement.sql.includes("SET fee_per_kit") ? 1 : 0] === true;
        }
        return {
        rows: state.ids.map(id => ({
          id,
          feePerKit: statement.sql.includes("SET fee_per_kit") ? statement.params[0] : "3.00",
          chargeFullFeeOnHalfKit: state.fullRule,
        })),
        };
      }
      return { rows: [] };
    },
  };
  return { ...schema, pool: {}, db: { ...tx, transaction: async (action: any) => action(tx) } };
});
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser(req: any, res: any, next: any) {
    if (req.headers["x-test-role"] !== "organiser") return res.status(401).json({ error: "Sign in" });
    req.organiser = { telegramUsername: "lead" }; next();
  },
}));
vi.mock("../middleware/require-admin", () => ({
  requireAdmin(req: any, res: any) {
    if (req.headers["x-test-role"] === "admin") return true;
    res.status(401).json({ error: "Admin required" }); return false;
  },
  setAdminMutationSummary: vi.fn(),
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: vi.fn(async () => {}) }));
import organiser from "./organiser";
import admin from "./group-buys-admin";
let server: Server, base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json(), organiser, admin);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { state.groupExists = true; state.fullRule = false; state.ids = ["p1", "p2"]; state.statements = []; });
async function save(scope: string, role: string, body: unknown) {
  const response = await fetch(`${base}/${scope}/group-buys/G/products/kit-fees`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-test-role": role },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
describe.each(["organiser", "admin"])("%s bulk kit fees", scope => {
  it("preserves an enabled half-kit rule when only the fee changes", async () => {
    await save(scope, scope, { productIds: "all", chargeFullFeeOnHalfKit: true });
    const result = await save(scope, scope, { productIds: "all", feePerKit: 4 });
    expect(result.status).toBe(200);
    expect(result.body.products.every((product: any) => product.feePerKit === 4 && product.chargeFullFeeOnHalfKit === true)).toBe(true);
    const updates = state.statements.filter(statement => statement.sql.includes("UPDATE group_buy_products"));
    expect(updates[1].sql).not.toContain("charge_full_fee_on_half_kit =");
  });
  it("can update only the half-kit rule without replacing the product's fee", async () => {
    state.ids = ["p1"];
    const result = await save(scope, scope, { productIds: ["p1"], chargeFullFeeOnHalfKit: true });
    expect(result.status).toBe(200);
    const update = state.statements.find(s => s.sql.includes("UPDATE group_buy_products"))!;
    expect(update.sql).toContain("charge_full_fee_on_half_kit");
    expect(update.sql).not.toMatch(/SET fee_per_kit/);
    expect(update.params[0]).toBe(true);
    expect(result.body.products).toEqual([{ id: "p1", feePerKit: 3, chargeFullFeeOnHalfKit: true }]);
    expect((await save(scope, scope, { productIds: ["p1"], chargeFullFeeOnHalfKit: false })).body.products)
      .toEqual([{ id: "p1", feePerKit: 3, chargeFullFeeOnHalfKit: false }]);
  });
  it.each(["true", 1, null])("rejects non-boolean half-kit fee settings %s", async value => {
    expect((await save(scope, scope, {
      productIds: "all", feePerKit: 3, chargeFullFeeOnHalfKit: value,
    })).status).toBe(400);
    expect(state.statements).toEqual([]);
  });
  it("rejects an empty settings update", async () => {
    expect((await save(scope, scope, { productIds: "all" })).status).toBe(400);
  });
  it("saves all selected links in one transaction without changing orders or catalogue prices", async () => {
    const result = await save(scope, scope, { productIds: ["p1", "p2"], feePerKit: "2.50" });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ updatedCount: 2, products: [
      { id: "p1", feePerKit: 2.5, chargeFullFeeOnHalfKit: false },
      { id: "p2", feePerKit: 2.5, chargeFullFeeOnHalfKit: false },
    ] });
    const update = state.statements.find(s => s.sql.includes("UPDATE group_buy_products"))!;
    expect(update.sql).toContain("UPDATE group_buy_products");
    expect(update.sql).toContain("group_buy_id =");
    expect(update.params).toEqual(["2.50", "G", "p1", "p2"]);
    expect(state.statements.filter(s => s.sql.includes("UPDATE group_buy_products"))).toHaveLength(1);
  });
  it("allows zero to clear fees and all-selection", async () => {
    expect((await save(scope, scope, { productIds: "all", feePerKit: 0 })).status).toBe(200);
  });
  it("rejects missing auth and cross-role access before writing", async () => {
    for (const role of ["", scope === "admin" ? "organiser" : "admin"]) {
      expect((await save(scope, role, { productIds: "all", feePerKit: 1 })).status).toBe(401);
    }
    expect(state.statements).toEqual([]);
  });
  it("rejects missing or non-owned groups and foreign products without writing", async () => {
    state.groupExists = false;
    expect((await save(scope, scope, { productIds: ["p1"], feePerKit: 1 })).status).toBe(404);
    state.groupExists = true;
    expect((await save(scope, scope, { productIds: ["p1", "p2", "foreign"], feePerKit: 1 })).status).toBe(400);
    expect(state.statements.some(s => s.sql.includes("UPDATE group_buy_products"))).toBe(false);
  });
  it("rejects invalid fees and empty selection before entering the transaction", async () => {
    expect((await save(scope, scope, { productIds: [], feePerKit: 1 })).status).toBe(400);
    expect((await save(scope, scope, { productIds: "all", feePerKit: -1 })).status).toBe(400);
    expect(state.statements).toEqual([]);
  });
});
