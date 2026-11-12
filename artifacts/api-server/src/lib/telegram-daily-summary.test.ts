import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const state = vi.hoisted(() => ({
  enabled: "true", claims: new Set<string>(), send: vi.fn(), sleep: vi.fn(), queries: [] as string[],
  pending: 0, open: 0, progress: 0, oldest: null as string | null,
  parcels: [] as any[], orders: [] as any[], failures: [] as any[], reminders: [] as any[],
}));
vi.mock("@workspace/db", async original => ({
  ...await original<typeof import("@workspace/db")>(),
  db: { execute: async (query: any) => {
    const text = new PgDialect().sqlToQuery(query).sql; state.queries.push(text);
    if (text.includes("FROM site_config")) return { rows: [{ value: state.enabled }] };
    if (text.includes("FROM tickets")) return { rows: [{ open: state.open, progress: state.progress, oldest: state.oldest }] };
    if (text.includes("FROM gb_parcels")) return { rows: state.parcels };
    if (text.includes("AS dates FROM orders")) return { rows: state.orders };
    if (text.includes("GROUP BY event_key")) return { rows: state.reminders };
    if (text.includes("telegram_message_logs")) return { rows: state.failures };
    return { rows: [{ count: state.pending }] };
  } },
}));
vi.mock("./telegram", () => ({ getAdminChatId: async () => "admin", sendTelegramMessageFull: state.send }));
vi.mock("./telegram-reminders", () => ({
  telegramAppUrl: () => "https://example.test", telegramJobDelay: vi.fn(),
  pendingPaymentSql: () => "status IN ('Submitted','Processing') AND deleted_at IS NULL",
  claimTelegramReminder: async (...args: string[]) => {
    const key = args.join(":"); if (state.claims.has(key)) return false; state.claims.add(key); return true;
  },
}));
vi.mock("./scheduler-registry", () => ({ registerScheduler: vi.fn() }));
import { runDailyAdminSummary, londonSummarySlot } from "./telegram-daily-summary";
describe("daily Telegram Admin summary", () => {
  beforeEach(() => {
    vi.stubEnv("PUBLIC_URL", "https://example.test"); state.enabled = "true"; state.claims.clear(); state.queries.length = 0;
    state.send.mockReset().mockResolvedValue({ ok: true }); state.sleep.mockReset();
    state.pending = state.open = state.progress = 0; state.oldest = null;
    state.parcels = []; state.orders = []; state.failures = []; state.reminders = [];
  });
  afterEach(() => vi.unstubAllEnvs());
  it("uses 08:00 Europe/London in winter and summer", () => {
    expect(londonSummarySlot(new Date("2026-11-12T08:00:15Z"))).toBe("2026-11-12");
    expect(londonSummarySlot(new Date("2026-07-12T07:00:15Z"))).toBe("2026-07-12");
    expect(londonSummarySlot(new Date("2026-07-12T08:00:15Z"))).toBeNull();
  });
  it("sends All clear once per London day to the Admin recipient", async () => {
    const options = { now: new Date("2026-11-12T08:00:15Z"), sleep: state.sleep };
    expect(await runDailyAdminSummary(options)).toBe(true);
    expect(await runDailyAdminSummary(options)).toBe(false);
    expect(state.send.mock.calls[0][1]).toBe("All clear");
    expect(state.send.mock.calls[0][3]).toEqual({ recipientType: "admin" });
  });
  it("counts stale tracking, tickets and failures without names or skipped errors", async () => {
    state.pending = 2; state.open = 1; state.progress = 2; state.oldest = "2026-11-10T08:00:00Z";
    state.parcels = [{ dates: ["2026-11-01T08:00:00Z"] }, { dates: ["invalid"] }];
    state.orders = [{ dates: ["2026-10-01T08:00:00Z", "2026-11-11T08:00:00Z"] }];
    state.failures = [{ error: "skipped: preference disabled", count: 90 }, { error: "Blocked @private_user <99)", count: 3 }];
    state.reminders = [{ kind: "payment_reminder", count: 4 }, { kind: "gb_closing", count: 1 }];
    await runDailyAdminSummary({ now: new Date("2026-11-12T08:00:15Z"), sleep: state.sleep });
    const text = state.send.mock.calls[0][1];
    expect(text).toContain("Awaiting payment >24h: 2");
    expect(text).toContain("Open tickets: 1");
    expect(text).toContain("Parcels with stale tracking: 1");
    expect(text).toContain("Orders with stale tracking: 0");
    expect(text).not.toContain("private_user");
    expect(text).not.toContain("skipped:");
    expect(text).toContain("&lt;99)");
    expect(state.sleep).toHaveBeenCalledWith(300);
  });
  it("honours the configuration and non-production gates", async () => {
    state.enabled = "false";
    expect(await runDailyAdminSummary({ now: new Date("2026-11-12T08:00Z") })).toBe(false);
    state.enabled = "true"; vi.stubEnv("PUBLIC_URL", "");
    expect(await runDailyAdminSummary({ now: new Date("2026-11-12T08:00Z") })).toBe(false);
    expect(state.send).not.toHaveBeenCalled();
  });
});
