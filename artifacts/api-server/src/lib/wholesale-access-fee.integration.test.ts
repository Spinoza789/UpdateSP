import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

describe.skipIf(process.env.ACCESS_FEE_DB_TESTS !== "1")("access fee protection / PostgreSQL", () => {
  const usernames: string[] = [];
  afterEach(async () => {
    const s = await import("@workspace/db");
    for (const username of usernames.splice(0)) {
      await s.db.delete(s.wholesaleAccessRequestsTable).where(eq(s.wholesaleAccessRequestsTable.accountUsername, username));
      await s.db.delete(s.accountsTable).where(eq(s.accountsTable.telegramUsername, username));
    }
  });
  async function fixture(overrides: Record<string, unknown> = {}) {
    const s = await import("@workspace/db");
    const api = await import("./wholesale-access-fee");
    const fee = await api.currentWholesaleAccessFee();
    expect(fee).not.toBeNull();
    const username = `synthetic-access-fee-${randomUUID()}`;
    usernames.push(username);
    await s.db.insert(s.accountsTable).values({ telegramUsername: username });
    const [request] = await s.db.insert(s.wholesaleAccessRequestsTable).values({
      accountUsername: username, amountUsd: fee! + 45, status: "pending",
      paymentTestAmount: 1.74, ...overrides,
    }).returning();
    return { s, api, username, fee: fee!, request };
  }
  async function bind(f: Awaited<ReturnType<typeof fixture>>, id: string | undefined, action = "pay", username = f.username) {
    let status = 200, body: any, error: unknown;
    const next = vi.fn(e => { error = e; });
    const req: any = { account: { telegramUsername: username },
      params: { accessRequestId: id }, path: `/account/wholesale-access/${action}` };
    await f.api.bindWholesaleAccessRequest(req, {
      setHeader: vi.fn(), status(code: number) { status = code; return this; },
      json(data: unknown) { body = data; },
    }, next);
    if (error) throw error;
    return { status, body, request: req.wholesaleAccessRequest, next };
  }
  it("replaces only the untouched quote and retains history without changing account money", async () => {
    const f = await fixture();
    const before = await f.s.db.select().from(f.s.accountsTable).where(eq(f.s.accountsTable.telegramUsername, f.username));
    const result = await f.api.replaceUntouchedAccessRequest(f.username, f.request.id, f.fee, true);
    expect(result.request.amountUsd).toBe(f.fee);
    expect(result.request.id).not.toBe(f.request.id);
    expect(result.request.paymentCryptoCurrency).toBeNull();
    expect(result.request.paymentTxHash).toBeNull();
    expect(result.feeReview.canReplace).toBe(false);
    const [old] = await f.s.db.select().from(f.s.wholesaleAccessRequestsTable)
      .where(eq(f.s.wholesaleAccessRequestsTable.id, f.request.id));
    expect(old.status).toBe("replaced");
    expect(old.amountUsd).toBe(f.fee + 45);
    expect(old.rejectionReason).toContain(`#${result.request.id}`);
    const after = await f.s.db.select().from(f.s.accountsTable).where(eq(f.s.accountsTable.telegramUsername, f.username));
    expect(after).toEqual(before);
    const ledger = await f.s.db.select().from(f.s.creditTransactionsTable)
      .where(eq(f.s.creditTransactionsTable.accountUsername, f.username));
    expect(ledger).toEqual([]);
  }, 20_000);
  it("serializes concurrent replacements into exactly one new request", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([1, 2].map(() =>
      f.api.replaceUntouchedAccessRequest(f.username, f.request.id, f.fee, true)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const requests = await f.s.db.select().from(f.s.wholesaleAccessRequestsTable)
      .where(eq(f.s.wholesaleAccessRequestsTable.accountUsername, f.username));
    expect(requests).toHaveLength(2);
    expect(requests.filter(r => r.status === "pending")).toHaveLength(1);
  });
  it.each([
    { testPaymentTxHash: "recorded-test" }, { paymentTxHash: "recorded-full" },
    { paymentCryptoCurrency: "USDC" }, { paymentCryptoNetwork: "ERC-20" },
    { status: "confirmed" }, { status: "rejected" },
  ])("rejects replacement after payment evidence or completion: %j", async overrides => {
    const f = await fixture(overrides);
    await expect(f.api.replaceUntouchedAccessRequest(f.username, f.request.id, f.fee, true))
      .rejects.toMatchObject({ status: 409 });
    const rows = await f.s.db.select().from(f.s.wholesaleAccessRequestsTable)
      .where(eq(f.s.wholesaleAccessRequestsTable.accountUsername, f.username));
    expect(rows).toEqual([f.request]);
  });
  it("requires confirmation and matching owner, request and reviewed fee", async () => {
    const f = await fixture();
    await expect(f.api.replaceUntouchedAccessRequest(f.username, f.request.id, f.fee, false))
      .rejects.toMatchObject({ status: 400 });
    await expect(f.api.replaceUntouchedAccessRequest("synthetic-other-account", f.request.id, f.fee, true))
      .rejects.toMatchObject({ status: 409 });
    await expect(f.api.replaceUntouchedAccessRequest(f.username, f.request.id + 1, f.fee, true))
      .rejects.toMatchObject({ status: 409 });
    await expect(f.api.replaceUntouchedAccessRequest(f.username, f.request.id, f.fee + 1, true))
      .rejects.toMatchObject({ status: 409 });
  });
  it.each(["lock-usdt-rate", "payments-info", "generate-test"])("blocks outdated payment instructions at %s", async action => {
    const f = await fixture();
    const result = await bind(f, String(f.request.id), action);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe("outdated_access_fee");
    expect(result.next).not.toHaveBeenCalled();
  });
  it("does not let a stale tab or another account target the replacement", async () => {
    const f = await fixture();
    const replacement = await f.api.replaceUntouchedAccessRequest(f.username, f.request.id, f.fee, true);
    expect((await bind(f, String(f.request.id))).status).toBe(409);
    expect((await bind(f, undefined)).status).toBe(409);
    expect((await bind(f, String(replacement.request.id), "pay", "synthetic-other-account")).status).toBe(409);
    const current = await bind(f, String(replacement.request.id), "lock-usdt-rate");
    expect(current.status).toBe(200);
    expect(current.request.id).toBe(replacement.request.id);
    expect(current.next).toHaveBeenCalledOnce();
  });
  it("keeps existing payment-in-progress quotes and legacy receipt submission working", async () => {
    const f = await fixture({ paymentCryptoCurrency: "USDC", paymentCryptoNetwork: "ERC-20", testPaymentTxHash: "recorded-test" });
    const quote = await bind(f, String(f.request.id), "lock-usdt-rate");
    expect(quote.status).toBe(200);
    expect(quote.request.amountUsd).toBe(f.fee + 45);
    const legacy = await bind(f, undefined);
    expect(legacy.status).toBe(200);
    expect(legacy.request.testPaymentTxHash).toBe("recorded-test");
  });
});
