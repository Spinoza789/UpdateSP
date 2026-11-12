import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logs = vi.hoisted(() => [] as any[]);
vi.mock("@workspace/db", async (original) => ({
  ...await original<typeof import("@workspace/db")>(),
  db: {
    insert: () => ({ values: (row: unknown) => { logs.push(row); return Promise.resolve(); } }),
  },
}));
vi.mock("./discord", () => ({ notifyUserDiscord: vi.fn(), sendAdminDiscordMessage: vi.fn() }));
import { sendTelegramMessageFull } from "./telegram";

describe("Telegram HTML delivery", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "admin");
    logs.length = 0;
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("retries an entity parse failure once as readable plain text", async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ ok: false, description: "Bad Request: can't parse entities" }) })
      .mockResolvedValueOnce({ json: async () => ({ ok: true, result: { message_id: 9 } }) });
    vi.stubGlobal("fetch", transport);
    const result = await sendTelegramMessageFull("admin", "<b>Oxytocin &lt;99) &amp; more</b>", "HTML", { recipientType: "admin" });
    expect(result).toMatchObject({ ok: true, messageId: 9 });
    const retry = JSON.parse(transport.mock.calls[1][1].body);
    expect(retry.text).toBe("Oxytocin <99) & more");
    expect(retry).not.toHaveProperty("parse_mode");
    expect(logs.some(row => row.delivered === false)).toBe(true);
  });
  it("splits long messages, keeping the keyboard on the final part only", async () => {
    const transport = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: { message_id: 10 } }) });
    vi.stubGlobal("fetch", transport);
    await sendTelegramMessageFull("admin", ("x".repeat(100) + "\n").repeat(90), "HTML",
      { recipientType: "admin" }, { reply_markup: { inline_keyboard: [] } });
    const parts = transport.mock.calls.map(call => JSON.parse(call[1].body));
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every(part => part.text.length <= 4096)).toBe(true);
    expect(parts.slice(0, -1).every(part => !part.reply_markup)).toBe(true);
    expect(parts.at(-1).reply_markup).toBeDefined();
  });
});
