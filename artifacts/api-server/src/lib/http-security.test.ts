import { afterAll, beforeAll, expect, it } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { securityHeaders } from "./http-security";

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use(securityHeaders);
  app.use((_req, res) => { res.send("<!doctype html><title>Fixture</title>"); });
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});

it.each([
  "/sleepingpepisadmin/janoshik-receiver",
  "/sleepingpepisadmin/janoshik-receiver?mode=bulk",
  "/sleepingpepisadmin/janoshik-receiver/",
])("preserves the cross-origin Janoshik opener only on receiver HTML: %s", async path => {
  const response = await fetch(base + path);
  expect(response.headers.get("cross-origin-opener-policy")).toBe("unsafe-none");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
});

it.each([
  "/", "/sleepingpepisadmin", "/vendor/admin", "/api/admin/auth/me",
  "/sleepingpepisadmin/janoshik-receiver-not-real",
  "/sleepingpepisadmin/janoshik-receiver/another-page",
])("retains opener isolation everywhere else: %s", async path => {
  const response = await fetch(base + path);
  expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
});
