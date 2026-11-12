import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const state = vi.hoisted(() => ({ rows: [] as any[], sql: "", claims: new Set<string>(), send: vi.fn(), sleep: vi.fn() }));
vi.mock("@workspace/db", async original => ({
  ...await original<typeof import("@workspace/db")>(),
  db: { execute: async (query: any) => { state.sql = new PgDialect().sqlToQuery(query).sql; return { rows: state.rows }; } },
}));
vi.mock("./telegram-reminders", () => ({
  telegramAppUrl: () => "https://example.test", telegramJobDelay: vi.fn(),
  claimTelegramReminder: async (...args: string[]) => {
    const key = args.join(":"); if (state.claims.has(key)) return false; state.claims.add(key); return true;
  },
}));
vi.mock("./telegram", () => ({
  getTemplate: async () => ({ enabled: true, template: "{{report_name}} {{gb_name}}" }),
  renderTemplate: (t: string, vars: Record<string,string>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ""),
  notifyUserFull: state.send,
}));
vi.mock("./scheduler-registry", () => ({ registerScheduler: vi.fn() }));
import { runLabReportNotifications } from "./telegram-lab-report-notifications";
describe("public group-buy report notifications", () => {
  beforeEach(() => {
    vi.stubEnv("PUBLIC_URL", "https://example.test"); state.claims.clear();
    state.send.mockReset().mockResolvedValue({ ok: true }); state.sleep.mockReset();
    state.rows = [{ id: 12, groupId: "gb1", groupName: "GB", reportName: "<99) & more", username: "member",
      chatId: "chat", pending: false, paymentStatus: "confirmed", deletedAt: null, preferences: {}, url: "https://verify.janoshik.com/tests/12" }];
  });
  afterEach(() => vi.unstubAllEnvs());
  it("uses explicit group linkage, not a product-name match, and sends once per report/member", async () => {
    expect(await runLabReportNotifications({ sleep: state.sleep })).toBe(1);
    expect(await runLabReportNotifications({ sleep: state.sleep })).toBe(0);
    expect(state.sql).toContain("o.group_buy_id = lab.group_buy_id");
    expect(state.sql).not.toContain("group_buy_coa_requests");
    expect(state.send.mock.calls[0][2]).toContain("&lt;99) &amp; more");
    expect(state.send.mock.calls[0][3].inline_keyboard[0][0].url).toBe("https://verify.janoshik.com/tests/12");
    expect(state.sleep).toHaveBeenCalledWith(300);
  });
  it.each([{ pending: true }, { groupId: null }, { paymentStatus: "unpaid" }, { deletedAt: new Date() },
    { preferences: { status: false } }, { chatId: null }])("does not notify ineligible/private reports or members: %j", async patch => {
    state.rows = [{ ...state.rows[0], ...patch }];
    expect(await runLabReportNotifications({ sleep: state.sleep })).toBe(0);
    expect(state.send).not.toHaveBeenCalled();
  });
});
