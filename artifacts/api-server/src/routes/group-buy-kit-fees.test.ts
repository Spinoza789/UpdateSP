import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { PgDialect } from "drizzle-orm/pg-core";

const state = vi.hoisted(() => ({
  groupExists: true,
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
      if (statement.sql.includes("UPDATE group_buy_products")) return {
        rows: state.ids.map(id => ({ id, feePerKit: statement.params[0] })),
      };
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
beforeEach(() => { state.groupExists = true; state.ids = ["p1", "p2"]; state.statements = []; });
async function save(scope: string, role: string, body: unknown) {
  const response = await fetch(`${base}/${scope}/group-buys/G/products/kit-fees`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-test-role": role },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
describe.each(["organiser", "admin"])("%s bulk kit fees", scope => {
  it("saves all selected links in one transaction without changing orders or catalogue prices", async () => {
    const result = await save(scope, scope, { productIds: ["p1", "p2"], feePerKit: "2.50" });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ updatedCount: 2, products: [{ id: "p1", feePerKit: 2.5 }, { id: "p2", feePerKit: 2.5 }] });
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
