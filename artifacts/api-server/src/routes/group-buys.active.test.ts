import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const { where } = vi.hoisted(() => ({ where: vi.fn() }));
vi.mock("@workspace/db", async () => ({
  ...(await import("@workspace/db/schema")),
  db: { select: () => ({ from: () => ({ where }) }) },
}));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (req: any, _res: any, next: () => void) => {
    req.account = { telegramUsername: "member" }; next();
  },
  getJwtSecret: () => "synthetic",
}));
import router from "./group-buys";

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use("/api", router);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => where.mockReset());

it("lists permitted groups even when the member's country has no reshipper, preserving country and account restrictions", async () => {
  where.mockResolvedValueOnce([{ country: "United States" }])
    .mockResolvedValueOnce([
      { id: "pending-us", name: "Pending US", allowedCountries: ["US"] },
      { id: "no-reshippers", name: "Not assigned yet" },
      { id: "uk-only", name: "Restricted", allowedCountries: ["GB"] },
      { id: "excluded", name: "Excluded", excludedCountries: ["US"] },
      { id: "blocked", name: "Blocked", blockedAccounts: ["member"] },
    ])
    .mockResolvedValueOnce([{ gbId: "pending-us", country: "GB", countries: null }])
    .mockResolvedValueOnce([{ id: "pending-us", countryLegsEnabled: false }]);
  const response = await fetch(`${base}/group-buys/active`);
  expect(response.status).toBe(200);
  const groups = await response.json();
  expect(groups.map((row: any) => row.id)).toEqual(["pending-us", "no-reshippers"]);
  expect(groups[0].reshipperCountries).toEqual(["GB"]);
});
