import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import { getTableName } from "drizzle-orm";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  owned: true, allowed: true, activeRefund: false, failUpdate: false, failNote: false,
  orders: [] as any[], updates: [] as any[], notes: [] as any[],
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const database: any = {
    select() {
      let table = "";
      const q: any = {
        from(t: any) { table = getTableName(t); return q; }, where() { return q; },
        orderBy() { return q; }, for() { return q; },
        then(resolve: any, reject: any) {
          return Promise.resolve(table === "group_buys" ? state.owned ? [{ id: "G", canEditPayment: state.allowed }] : []
            : table === "orders" ? state.orders : table === "group_buy_refunds" && state.activeRefund ? [{ id: "R", orderId: "O", status: "requested" }] : []).then(resolve, reject);
        },
      }; return q;
    },
    update() {
      let patch: any;
      const q: any = {
        set(v: any) { patch = v; return q; }, where() { return q; },
        returning() { state.updates.push(patch); return Promise.resolve(state.failUpdate ? [] : state.orders); },
      }; return q;
    },
    insert() { return { values: async (value: any) => { if (state.failNote) throw new Error("Notes unavailable"); state.notes.push(...(Array.isArray(value) ? value : [value])); } }; },
    async transaction(work: any) {
      try { return await work(database); }
      catch (error) { state.updates = []; state.notes = []; throw error; }
    },
  };
  return { ...schema, pool: {}, db: database };
});
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser(req: any, res: any, next: any) {
    if (!req.headers["x-organiser"]) return res.status(401).json({ error: "Sign in" });
    req.organiser = { telegramUsername: "owner" }; next();
  },
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("../lib/telegram", () => ({ notifyUserFromTemplate: vi.fn(async () => {}) }));
import router from "./organiser-mark-paid";
import { eligibleOrder, paymentDate } from "../lib/supplier-batches-model";
let server: Server, base: string;
beforeAll(async () => {
  const app = express(); app.use(express.json(), router);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  state.owned = true; state.allowed = true; state.activeRefund = false; state.failUpdate = false; state.failNote = false;
  state.updates = []; state.notes = [];
  state.orders = [{ id: "O", code: "123", groupBuyId: "G", telegramUsername: "member", status: "Shipped", paymentStatus: "unpaid", amountDue: "20.00", paymentTxHash: "fiat:bank_transfer", adminNotes: "Keep this" }];
});
async function pay(body: unknown = { orderIds: ["O"], note: "Bank transfer received" }, signedIn = true) {
  const response = await fetch(`${base}/organiser/group-buys/G/orders/mark-paid`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(signedIn ? { "x-organiser": "owner" } : {}) }, body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
it("marks only payment paid and saves the private note with server actor/time, preserving balances, tracking and TXIDs", async () => {
  expect((await pay()).status).toBe(200);
  const patch = state.updates[0];
  expect(patch).toMatchObject({ paymentStatus: "confirmed", paymentRejectionReason: null });
  expect(patch.paymentConfirmedAt).toBeInstanceOf(Date);
  expect(patch.adminNotes).toContain("Keep this");
  expect(patch.adminNotes).toContain("Bank transfer received");
  expect(patch.adminNotes).toContain("@owner");
  for (const key of ["amountDue", "status", "paymentTxHash", "balancePaymentStatus", "grandTotal", "trackingNumber"]) expect(patch).not.toHaveProperty(key);
  expect(state.notes[0]).toMatchObject({ orderId: "O", author: "owner", body: "Bank transfer received" });
});
it.each(["", "   ", null, 123, "x".repeat(2001)])("requires a valid payment note (%s)", async note => {
  expect((await pay({ orderIds: ["O"], note })).status).toBe(400);
  expect(state.updates).toEqual([]);
});
it("marks selected orders together and skips already-paid orders without duplicate notes", async () => {
  state.orders.push({ ...state.orders[0], id: "O2", code: "124" });
  const result = await pay({ orderIds: ["O", "O2"], note: "Cash collected" });
  expect(result.status).toBe(200); expect(result.body.updated).toBe(2); expect(state.notes).toHaveLength(2);
  state.orders.forEach(o => { o.paymentStatus = "confirmed"; });
  state.updates = []; state.notes = [];
  expect((await pay({ orderIds: ["O", "O2"], note: "Cash collected" })).body.updated).toBe(0);
  expect(state.notes).toHaveLength(0);
});
it("keeps authentication and group ownership checks", async () => {
  expect((await pay(undefined, false)).status).toBe(401);
  state.owned = false; expect((await pay()).status).toBe(404);
  expect(state.updates).toEqual([]);
});
it("rejects missing or cross-group selections atomically", async () => {
  expect((await pay({ orderIds: ["O", "other"], note: "Checked" })).status).toBe(404);
  expect(state.updates).toEqual([]);
});
it("respects Admin's payment-status editing permission", async () => {
  state.allowed = false; expect((await pay()).status).toBe(403); expect(state.updates).toEqual([]);
});
it("blocks active refunds without updating any selected order", async () => {
  state.activeRefund = true; expect((await pay()).status).toBe(409); expect(state.updates).toEqual([]);
});
it.each([[], Array.from({ length: 101 }, (_, i) => `O${i}`), ["O", 7]])("rejects invalid selections", async orderIds => {
  expect((await pay({ orderIds, note: "Received" })).status).toBe(400); expect(state.updates).toEqual([]);
});
it.each(["Cancelled", "Refunded", "Draft"])("does not pay %s orders", async status => {
  state.orders[0].status = status; expect((await pay()).status).toBe(409); expect(state.updates).toEqual([]);
});
it("does not pay refunded, deleted or test orders", async () => {
  for (const patch of [{ paymentStatus: "refunded" }, { deletedAt: new Date() }, { orderType: "test" }]) {
    state.orders = [{ id: "O", status: "Submitted", paymentStatus: "unpaid", ...patch }];
    expect((await pay()).status).toBe(409);
  }
});
it("rolls back if a refund/status guard or note insertion fails", async () => {
  state.failUpdate = true; expect((await pay()).status).toBe(409); expect(state.notes).toEqual([]);
  state.failUpdate = false; state.failNote = true; expect((await pay()).status).toBe(500); expect(state.updates).toEqual([]);
});

async function payBalance(expectedAmountDue = 20, note = "Extra kit fee received", signedIn = true) {
  const response = await fetch(`${base}/organiser/group-buys/G/orders/mark-balance-paid`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(signedIn ? { "x-organiser": "owner" } : {}) },
    body: JSON.stringify({ orderIds: ["O"], note, expectedAmountDue }),
  });
  return { status: response.status, body: await response.json() };
}
it("settles only the outstanding balance, preserving original payment, TXIDs and fulfilment", async () => {
  state.orders[0].paymentStatus = "confirmed";
  expect((await payBalance()).status).toBe(200);
  const patch = state.updates[0];
  expect(patch).toMatchObject({ amountDue: "0.00", balancePaymentStatus: "confirmed", balanceCryptoQuote: null });
  expect(patch.balanceConfirmedAt).toBeInstanceOf(Date);
  expect(patch.adminNotes).toContain("20.00");
  expect(patch.adminNotes).toContain("@owner");
  expect(patch.adminNotes).toContain("Extra kit fee received");
  for (const key of ["paymentStatus", "paymentConfirmedAt", "paymentTxHash", "balanceTxHash", "grandTotal", "status"]) expect(patch).not.toHaveProperty(key);
  expect(state.notes[0].body).toContain("Extra kit fee received");
  const telegram = await import("../lib/telegram");
  expect(telegram.notifyUserFromTemplate).not.toHaveBeenCalled();
});
it("makes a submitted order batch-eligible only after the additional payment is confirmed", async () => {
  const original = {
    ...state.orders[0], status: "Submitted", paymentStatus: "confirmed", amountDue: "6.00",
    shippingCountry: "GB", paymentConfirmedAt: new Date("2026-11-13T10:00:00Z"),
    lineItems: [{ productId: "P", productName: "Kit", quantity: 2, unitPrice: "100", lineTotal: "200" }],
  };
  state.orders = [original];
  expect(eligibleOrder(original)).toBe("Outstanding order balance");
  // Toggling the original Paid status must not invent receipt of the extra money.
  expect((await pay()).body.updated).toBe(0);
  expect(eligibleOrder(original)).toBe("Outstanding order balance");
  expect((await payBalance(6)).status).toBe(200);
  const settled = { ...original, ...state.updates[0] };
  expect(eligibleOrder(settled)).toBeNull();
  expect(paymentDate(settled)).toBe(settled.balanceConfirmedAt.toISOString());
  expect(settled.paymentStatus).toBe("confirmed");
  expect(settled.grandTotal).toBe(original.grandTotal);
});
it("rejects stale balances and makes confirmed replays harmless", async () => {
  expect((await payBalance(6)).status).toBe(409);
  expect(state.updates).toHaveLength(0);
  state.orders[0].amountDue = "0.00";
  state.orders[0].balancePaymentStatus = "confirmed";
  expect((await payBalance()).body).toMatchObject({ updated: 0, skipped: 1 });
  expect(state.notes).toHaveLength(0);
});
it("protects balance confirmation with authentication, ownership, permission, refund and note checks", async () => {
  expect((await payBalance(20, "Received", false)).status).toBe(401);
  state.owned = false; expect((await payBalance()).status).toBe(404); state.owned = true;
  state.allowed = false; expect((await payBalance()).status).toBe(403); state.allowed = true;
  state.activeRefund = true; expect((await payBalance()).status).toBe(409); state.activeRefund = false;
  expect((await payBalance(20, " ")).status).toBe(400);
  state.orders[0].status = "Cancelled"; expect((await payBalance()).status).toBe(409);
  expect(state.updates).toHaveLength(0);
});
it("does not settle zero balances and rolls back if saving the receipt note fails", async () => {
  state.orders[0].amountDue = "0.00";
  expect((await payBalance()).status).toBe(409);
  state.orders[0].amountDue = "20.00";
  state.failNote = true;
  expect((await payBalance()).status).toBe(500);
  expect(state.updates).toHaveLength(0);
});
it.each([0, -1, "20", null])("rejects an invalid expected balance (%s)", async expectedAmountDue => {
  const response = await fetch(`${base}/organiser/group-buys/G/orders/mark-balance-paid`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-organiser": "owner" },
    body: JSON.stringify({ orderIds: ["O"], note: "Received", expectedAmountDue }),
  });
  expect(response.status).toBe(400);
  expect(state.updates).toHaveLength(0);
});
