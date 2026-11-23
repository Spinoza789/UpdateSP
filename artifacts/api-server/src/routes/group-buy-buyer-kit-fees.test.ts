import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
  queries: [] as Record<string, unknown>[],
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return {
    ...schema,
    pool: {},
    db: {
      select(fields: Record<string, unknown>) {
        state.queries.push(fields);
        const index = state.queries.length;
        const query: any = {
          from() { return query; }, where() { return query; }, orderBy() { return query; },
          innerJoin() { return query; },
          then(resolve: any, reject: any) {
            const rows = index === 1 ? [{ id: "membership" }]
              : index === 2 ? [{ status: "active" }]
              : [{ productId: "product", name: "Test kit", price: "100.00",
                  priceOverride: null, feePerKit: "3.00", halfKitEnabled: true }];
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return query;
      },
    },
  };
});
vi.mock("../middleware/account-auth", () => ({
  requireAccount(req: any, _res: any, next: any) {
    req.account = { telegramUsername: "member" }; next();
  },
  getJwtSecret: () => "test-only",
}));
import router from "./group-buys";

let server: Server;
let url: string;
beforeAll(async () => {
  const app = express();
  app.use(router);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });

test("member ordering products include the saved kit fee without modifying the product price", async () => {
  const response = await fetch(`${url}/group-buys/7M9AL/products`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([expect.objectContaining({
    id: "product", price: 100, feePerKit: 3,
  })]);
  expect(state.queries[2]).toHaveProperty("feePerKit");
});
