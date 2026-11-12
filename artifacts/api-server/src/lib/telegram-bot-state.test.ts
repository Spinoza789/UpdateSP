import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const queries = vi.hoisted(() => [] as { sql: string; params: unknown[] }[]);
const result = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock("@workspace/db", async original => ({
  ...await original<typeof import("@workspace/db")>(),
  db: { execute: async (query: any) => { queries.push(new PgDialect().sqlToQuery(query)); return result; } },
}));
vi.mock("./scheduler-registry", () => ({ registerScheduler: vi.fn() }));
import { clearBotState, getBotState, setBotState, incrementBotAiUsage, registerTelegramCleanupScheduler } from "./telegram-bot-state";
import { registerScheduler } from "./scheduler-registry";

describe("persistent Telegram state", () => {
  beforeEach(() => { queries.length = 0; result.rows = []; });
  it("loads state with database-time expiry and returns no expired conversation", async () => {
    expect(await getBotState("chat", "ticket", 600_000)).toBeNull();
    expect(queries[0].sql).toMatch(/updated_at > now\(\)/);
    expect(queries[0].params).toEqual(["chat", "ticket", 600_000]);
    result.rows = [{ state: { step: "awaiting_body" } }];
    expect(await getBotState("chat", "ticket", 600_000)).toEqual({ step: "awaiting_body" });
  });
  it("upserts and clears chat/kind state without touching accounts", async () => {
    await setBotState("code", "used_token", { consumed: true });
    expect(queries[0].sql).toContain("ON CONFLICT (chat_id, kind) DO UPDATE");
    expect(queries[0].params).toEqual(["code", "used_token", '{"consumed":true}']);
    await clearBotState("chat", "ticket");
    expect(queries[1].sql).toContain("DELETE FROM telegram_bot_state");
    expect(queries[1].params).toEqual(["chat", "ticket"]);
  });
  it("increments AI usage atomically without extending an active 24-hour window", async () => {
    result.rows = [{ state: { count: 3 } }];
    expect(await incrementBotAiUsage("chat")).toBe(3);
    expect(queries[0].sql).toContain("ON CONFLICT (chat_id, kind) DO UPDATE");
    expect(queries[0].sql).toContain("interval '24 hours'");
    expect(queries[0].sql).toContain("ELSE telegram_bot_state.updated_at");
  });
  it("schedules daily cleanup for updates and each state expiry", async () => {
    registerTelegramCleanupScheduler();
    const descriptor = vi.mocked(registerScheduler).mock.calls.at(-1)![0];
    expect(descriptor.defaultIntervalMs).toBe(86_400_000);
    await descriptor.run();
    expect(queries.map(query => query.sql).join("\n")).toContain("interval '10 minutes'");
    expect(queries.map(query => query.sql).join("\n")).toContain("interval '20 minutes'");
    expect(queries.map(query => query.sql).join("\n")).toContain("interval '24 hours'");
    expect(queries.map(query => query.sql).join("\n")).toContain("interval '2 days'");
  });
});
