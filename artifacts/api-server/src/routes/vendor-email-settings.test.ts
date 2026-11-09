import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import { createVendorEmailSettingsRouter } from "./vendor-email-settings";
import { createVendorAuthentication, vendorTokenHash, vendorCsrfToken } from "../middleware/vendor-auth";

describe("vendor email settings access", () => {
  const token = "a".repeat(64);
  const service = { get: vi.fn(async () => ({ email: null, enabled: false })), start: vi.fn(async () => ({ pendingEmail: "vendor@example.com" })), verify: vi.fn(async () => ({ enabled: true })), toggle: vi.fn(async () => ({ enabled: false })), preferences: vi.fn(async () => ({ newOrders: false, messages: true })), cancel: vi.fn(async () => ({})) };
  let server: Server, base: string;
  beforeAll(async () => {
    const auth = createVendorAuthentication({
      getSession: async (hash: string) => hash === vendorTokenHash(token) ? { account: { username: "owner", vendorId: "v1", status: "active" }, session: {} } : null,
    } as any);
    const app = express(); app.use(express.json(), cookieParser());
    app.use(createVendorEmailSettingsRouter(service as any, auth.identity, false));
    server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
  function request(method: string, path = "", headers = {}, body?: any) {
    return fetch(`${base}/vendor/email-settings${path}`, { method, headers: { origin: base, "content-type": "application/json", ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  const headers = { cookie: `peps_vendor_session=${token}`, "x-vendor-csrf": vendorCsrfToken(token) };
  it("requires dedicated vendor authentication and CSRF, and rejects foreign origins", async () => {
    expect((await request("GET")).status).toBe(401);
    expect((await request("POST", "/start", { cookie: headers.cookie }, { email: "vendor@example.com" })).status).toBe(403);
    expect((await request("POST", "/start", { ...headers, origin: "https://foreign.example" }, { email: "vendor@example.com" })).status).toBe(403);
    expect(service.start).not.toHaveBeenCalled();
  });
  it("always uses the session owner, never a supplied username or vendor", async () => {
    const response = await request("GET", "", headers);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(service.get).toHaveBeenCalledWith("owner");
    for (const [path, body] of [
      ["/start", { email: "vendor@example.com" }], ["/verify", { code: "ABC12345" }],
      ["/toggle", { enabled: false }], ["/cancel", {}],
      ["/preferences", { newOrders: false, messages: true }],
    ] as const) {
      expect((await request("POST", path, headers, { ...body, username: "victim", vendorId: "v2" })).status).toBe(200);
    }
    expect(service.start).toHaveBeenCalledWith("owner", "vendor@example.com");
    expect(service.verify).toHaveBeenCalledWith("owner", "ABC12345");
    expect(service.toggle).toHaveBeenCalledWith("owner", false);
    expect(service.cancel).toHaveBeenCalledWith("owner");
    expect(service.preferences).toHaveBeenCalledWith("owner", { newOrders: false, messages: true, username: "victim", vendorId: "v2" });
  });
});
