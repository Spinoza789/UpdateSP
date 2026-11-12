import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const state = vi.hoisted(() => ({
  candidates: [] as any[], claims: new Set<string>(), queries: [] as { sql: string; params: unknown[] }[],
  send: vi.fn(), sleep: vi.fn(),
}));
vi.mock("@workspace/db", async original => ({
  ...await original<typeof import("@workspace/db")>(),
  db: { execute: async (sql: any) => {
    const query = new PgDialect().sqlToQuery(sql); state.queries.push(query);
    if (query.sql.includes("INSERT INTO telegram_reminders_sent")) {
      const key = JSON.stringify(query.params);
      if (state.claims.has(key)) return { rows: [] };
      state.claims.add(key); return { rows: [{ ref_id: "claimed" }] };
    }
    return { rows: state.candidates };
  } },
}));
vi.mock("./telegram", () => ({
  notifyUserFull: state.send,
  getTemplate: async () => ({ enabled: true, template: "{{code}} {{gb_name}} {{total}} {{currency}}" }),
  renderTemplate: (template: string, vars: Record<string, string>) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? ""),
}));
vi.mock("./scheduler-registry", () => ({ registerScheduler: vi.fn() }));
import { runPaymentReminders, registerPaymentReminderScheduler, runClosingReminders } from "./telegram-reminders";
import { registerScheduler } from "./scheduler-registry";

const eligible = () => ({
  id: "order1", code: "123", username: "member", chatId: "chat", status: "Submitted", paymentStatus: "unpaid",
  createdAt: new Date(Date.now() - 30 * 3_600_000), deletedAt: null, preferences: {}, groupName: "GB <99) & more",
  total: "120.00", currency: "USD",
});

describe("group-buy closing reminders", () => {
  beforeEach(() => {
    vi.stubEnv("PUBLIC_URL", "https://example.test"); state.claims.clear(); state.queries.length = 0;
    state.send.mockReset().mockResolvedValue({ ok: true }); state.sleep.mockReset();
    state.candidates = [{ id: "gb1", username: "member", chatId: "chat", preferences: {}, name: "GB <99) & more",
      status: "active", hidden: false, hasOrder: false, closeDate: new Date(Date.now() + 12 * 3_600_000) }];
  });
  afterEach(() => vi.unstubAllEnvs());
  it("sends once to a joined member with no order and links to that group", async () => {
    expect(await runClosingReminders({ sleep: state.sleep })).toBe(1);
    expect(await runClosingReminders({ sleep: state.sleep })).toBe(0);
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.send.mock.calls[0][2]).toContain("GB &lt;99) &amp; more");
    expect(state.send.mock.calls[0][3].inline_keyboard[0][0].url).toContain("/order?gbId=gb1");
    expect(state.queries[0].sql).toContain("account_group_buys");
    expect(state.queries[0].sql).toContain("NOT EXISTS");
  });
  it.each([{ status: "closed" }, { status: "draft" }, { hidden: true }, { hasOrder: true },
    { closeDate: new Date(Date.now() + 72 * 3_600_000) }, { closeDate: new Date(0) }, { preferences: { reminders: false } }])
  ("skips ineligible groups or members: %j", async patch => {
    state.candidates = [{ ...state.candidates[0], ...patch }];
    expect(await runClosingReminders({ sleep: state.sleep })).toBe(0);
    expect(state.send).not.toHaveBeenCalled();
  });
});
describe("unpaid Telegram reminders", () => {
  beforeEach(() => { vi.stubEnv("PUBLIC_URL", "https://example.test"); state.candidates = [eligible()];
    state.claims.clear(); state.queries.length = 0; state.send.mockReset().mockResolvedValue({ ok: true }); state.sleep.mockReset(); });
  afterEach(() => vi.unstubAllEnvs());
  it("claims before transport and sends once across repeated runs", async () => {
    expect(await runPaymentReminders({ sleep: state.sleep })).toBe(1);
    expect(await runPaymentReminders({ sleep: state.sleep })).toBe(0);
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.send.mock.calls[0][2]).toContain("GB &lt;99) &amp; more");
    expect(state.send.mock.calls[0][1]).toBe("reminders");
    expect(state.send.mock.calls[0][3].inline_keyboard[0][0]).toMatchObject({ text: "Pay now" });
    expect(state.queries[1].sql).toContain("ON CONFLICT DO NOTHING");
    expect(state.sleep).toHaveBeenCalledWith(300);
  });
  it.each([
    { paymentStatus: "confirmed" }, { paymentStatus: "test_confirmed" }, { paymentStatus: "pending_confirmation" },
    { status: "Cancelled" }, { deletedAt: new Date() }, { preferences: { reminders: false } },
    { createdAt: new Date() }, { chatId: null },
  ])("does not remind an ineligible order: %j", async patch => {
    state.candidates = [{ ...eligible(), ...patch }];
    expect(await runPaymentReminders({ sleep: state.sleep })).toBe(0);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("does nothing in development and registers an hourly production worker", async () => {
    vi.stubEnv("PUBLIC_URL", "");
    expect(await runPaymentReminders({ sleep: state.sleep })).toBe(0);
    registerPaymentReminderScheduler();
    expect(registerScheduler).not.toHaveBeenCalled();
    vi.stubEnv("PUBLIC_URL", "https://example.test");
    registerPaymentReminderScheduler();
    expect(vi.mocked(registerScheduler).mock.calls.at(-1)?.[0].defaultIntervalMs).toBe(3_600_000);
  });
});
