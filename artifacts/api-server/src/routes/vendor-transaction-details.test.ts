import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("@workspace/db", async () => ({ ...await import("../../../../lib/db/src/schema/index"), db: {} }));
vi.mock("../lib/transaction-details", () => ({ lookupTransactionDetails: lookup }));
vi.mock("../middleware/vendor-auth", () => ({ requireVendorAccount: (_req: any, res: any) => res.status(403).end() }));
vi.mock("./config", () => ({ getVendors: vi.fn() }));
vi.mock("../lib/vendor-portal-service", () => ({ vendorAccess: vi.fn() }));
vi.mock("../lib/vendor-payment-tools", () => ({
  acknowledgeSupplierPaid: vi.fn(), clearSupplierPaid: vi.fn(), editSupplierCosts: vi.fn(), exportSupplierPayments: vi.fn(),
}));
vi.mock("../lib/vendor-profit-report-service", () => ({
  vendorProfitReport: vi.fn(), productRefundReviewOptions: vi.fn(), reviewProductRefund: vi.fn(),
}));
vi.mock("../lib/vendor-order-comparison", () => ({ vendorOrderComparison: vi.fn() }));
vi.mock("../lib/vendor-payments", () => ({
  listVendorPayments: vi.fn(), recordVendorPayment: vi.fn(), vendorPaymentDashboard: vi.fn(), voidVendorPayment: vi.fn(),
}));

describe("Admin-only transaction lookup route", () => {
  let server: Server, base: string;
  beforeAll(async () => {
    const { default: router } = await import("./vendor-payments");
    const app = express();
    app.use((req, res, next) => {
      // Simulate the already-validated upstream admin session, not a vendor login.
      res.locals.adminModeEnabled = true;
      res.locals.adminAuthorized = req.headers["x-test-session"] === "admin";
      next();
    });
    app.use(router);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}/admin/vendor-payments/transaction-details`;
  });
  afterAll(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  beforeEach(() => { lookup.mockReset(); });
  it("rejects anonymous and vendor requests before contacting any blockchain", async () => {
    for (const session of ["", "vendor"]) {
      const response = await fetch(`${base}?network=Ethereum&txid=anything`, { headers: { "x-test-session": session } });
      expect(response.status).toBe(401);
    }
    expect(lookup).not.toHaveBeenCalled();
  });
  it("returns read-only evidence for an authenticated Admin with no browser caching", async () => {
    const evidence = { status: "confirmed", transfers: [{ recipient: "wallet", amount: "1550", currency: "USDT" }], checkedAt: "now" };
    lookup.mockResolvedValue(evidence);
    const response = await fetch(`${base}?network=ERC-20&txid=test`, { headers: { "x-test-session": "admin" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(evidence);
    expect(lookup).toHaveBeenCalledWith("ERC-20", "test");
  });
  it("rejects missing input and returns a clear validation error", async () => {
    const headers = { "x-test-session": "admin" };
    expect((await fetch(base, { headers })).status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
    lookup.mockRejectedValue(new Error("Only Ethereum and Solana are supported."));
    const response = await fetch(`${base}?network=BSC&txid=test`, { headers });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/supported/) });
  });
});
