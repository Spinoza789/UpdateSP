import express from "express";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  lookup: vi.fn(), write: vi.fn(), owner: "owner", deleted: false, fail: false,
  order: {} as Record<string, unknown>, queries: [] as Array<{ table: string; sql: string; params: unknown[] }>,
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, pool: {}, db: {
    select: () => ({ from: (table: any) => ({ where: async (condition: any) => {
      if (fixture.fail) throw new Error("DB unavailable");
      const query = new PgDialect().sqlToQuery(condition);
      const name = getTableName(table);
      fixture.queries.push({ table: name, ...query });
      return name === "group_buys" ? query.params[0] === "G" && (query.params.length === 1 || query.params[1] === fixture.owner) ? [{ id: "G" }] : []
        : query.params[0] === "O" && query.params[1] === "G" && !fixture.deleted ? [fixture.order] : [];
    } }) }),
    update: fixture.write, insert: fixture.write, delete: fixture.write,
  } };
});
vi.mock("../lib/transaction-details", () => ({ lookupTransactionDetails: fixture.lookup }));
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser(req: any, res: any, next: any) {
    if (!req.headers["x-organiser"]) return res.status(401).json({ error: "Sign in" });
    req.organiser = { telegramUsername: req.headers["x-organiser"], isAdmin: req.headers["x-admin"] === "yes", adminGbId: req.headers["x-admin-gb"] };
    next();
  },
}));
import router from "./organiser-transaction-details";
const hash = `0x${"a".repeat(64)}`;
let server: Server, base: string;
beforeAll(async () => {
  const app = express(); app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  fixture.owner = "owner"; fixture.deleted = false; fixture.fail = false; fixture.queries = [];
  fixture.order = { paymentTxHash: hash }; fixture.write.mockClear();
  fixture.lookup.mockReset().mockResolvedValue({ status: "confirmed", transfers: [], blockTime: "2023-11-14T22:13:20.000Z", senderAddress: `0x${"b".repeat(40)}` });
});
const get = (txid = hash, headers: Record<string, string> = { "x-organiser": "owner" }, group = "G", order = "O") =>
  fetch(`${base}/organiser/group-buys/${group}/orders/${order}/transaction-details?${new URLSearchParams({ txid })}`, { headers });
describe("organiser transaction evidence", () => {
  it("returns recorded transaction evidence read-only and prevents response caching", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ blockTime: "2023-11-14T22:13:20.000Z" });
    expect(fixture.lookup).toHaveBeenCalledWith("Ethereum", hash);
    expect(fixture.queries.find(query => query.table === "orders")?.sql).toContain('"deleted_at" is null');
    expect(fixture.write).not.toHaveBeenCalled();
  });
  it.each(["paymentTxHash", "paymentTxHashes", "testPaymentTxHash", "balanceTxHash"])("allows the recorded %s reference", async field => {
    fixture.order = { [field]: field === "paymentTxHashes" ? [hash] : hash };
    expect((await get()).status).toBe(200);
  });
  it("keeps authentication, group ownership and order membership checks", async () => {
    expect((await get(hash, {})).status).toBe(401);
    expect((await get(hash, { "x-organiser": "other" })).status).toBe(404);
    expect((await get(hash, undefined, "OTHER")).status).toBe(404);
    expect((await get(hash, undefined, "G", "OTHER")).status).toBe(404);
    fixture.deleted = true; expect((await get()).status).toBe(404);
    expect(fixture.lookup).not.toHaveBeenCalled();
  });
  it("rejects arbitrary transaction hashes before any provider request", async () => {
    expect((await get(`0x${"c".repeat(64)}`)).status).toBe(404);
    expect((await get("fiat:bank_transfer")).status).toBe(400);
    expect((await get("https://evil.test")).status).toBe(400);
    expect(fixture.lookup).not.toHaveBeenCalled();
  });
  it("honours scoped Admin impersonation without granting cross-group access", async () => {
    const headers = { "x-organiser": "admin", "x-admin": "yes", "x-admin-gb": "OTHER" };
    expect((await get(hash, headers)).status).toBe(403);
    expect((await get(hash, { ...headers, "x-admin-gb": "G" })).status).toBe(200);
  });
  it("preserves case sensitivity for Solana signatures", async () => {
    const signature = `${"3".repeat(87)}A`;
    fixture.order = { paymentTxHash: signature };
    expect((await get(signature.toLowerCase())).status).toBe(404);
    expect((await get(signature)).status).toBe(200);
    expect(fixture.lookup).toHaveBeenCalledWith("Solana", signature);
  });
  it("does not look up another recorded EVM network on Ethereum", async () => {
    fixture.order.paymentCryptoNetwork = "BSC";
    expect((await get()).status).toBe(400);
    expect(fixture.lookup).not.toHaveBeenCalled();
  });
});
