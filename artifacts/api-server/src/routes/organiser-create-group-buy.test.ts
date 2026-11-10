import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  existingOwner: "another-organiser" as string | null,
  writes: [] as Record<string, unknown>[],
}));
vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"),
  pool: {},
  db: {
    select(fields: Record<string, unknown>) {
      const query: any = {
        from() { return query; },
        where() { return query; },
        then(resolve: any, reject: any) {
          // The manufacturer-conflict query selects name; ID allocation only selects id.
          return Promise.resolve("name" in fields ? [{
            id: "existing", name: "Existing active group", organiserId: state.existingOwner,
          }] : []).then(resolve, reject);
        },
      };
      return query;
    },
    insert() {
      const query: any = {
        values(value: Record<string, unknown>) { state.writes.push(value); return query; },
        returning() { return Promise.resolve([state.writes.at(-1)]); },
      };
      return query;
    },
  },
}));
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser(req: any, res: any, next: any) {
    if (!req.headers["x-test-organiser"]) {
      res.status(401).json({ error: "Sign in" });
      return;
    }
    req.organiser = { telegramUsername: "owner" };
    next();
  },
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: vi.fn(async () => {}) }));
import router from "./organiser";

let server: Server, base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json(), router);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { state.writes = []; state.existingOwner = "another-organiser"; });

async function create(body: Record<string, unknown>, signedIn = true) {
  const response = await fetch(`${base}/organiser/group-buys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(signedIn ? { "x-test-organiser": "owner" } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe("group-buy creation with a shared vendor", () => {
  it.each(["another-organiser", "owner", null])(
    "allows the same manufacturer when an active group belongs to %s",
    async existingOwner => {
      state.existingOwner = existingOwner;
      const result = await create({ name: "New group", manufacturer: "Same supplier" });
      expect(result.status).toBe(201);
      expect(result.body).toMatchObject({
        name: "New group", manufacturer: "Same supplier", organiserId: "owner",
        status: "draft", approvalStatus: "pending_approval", hiddenFromList: true,
      });
      expect(state.writes).toHaveLength(1);
    },
  );
  it("still requires organiser authentication", async () => {
    expect((await create({ name: "New group", manufacturer: "Same supplier" }, false)).status).toBe(401);
    expect(state.writes).toEqual([]);
  });
  it("still validates required names and member limits", async () => {
    expect((await create({ name: " ", manufacturer: "Same supplier" })).status).toBe(400);
    expect((await create({ name: "New group", manufacturer: "Same supplier", memberLimit: 0 })).status).toBe(400);
    expect(state.writes).toEqual([]);
  });
});
