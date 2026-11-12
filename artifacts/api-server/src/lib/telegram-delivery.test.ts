import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logs = vi.hoisted(() => [] as any[]);
vi.mock("@workspace/db", async (original) => ({
  ...await original<typeof import("@workspace/db")>(),
  db: {
    insert: () => ({ values: (row: unknown) => { logs.push(row); return Promise.resolve(); } }),
  },
}));
vi.mock("./discord", () => ({ notifyUserDiscord: vi.fn(), sendAdminDiscordMessage: vi.fn() }));
import { sendTelegramMessageFull, sendTelegramPhoto, downloadTelegramTicketFile } from "./telegram";

describe("Telegram HTML delivery", () => {
  it("downloads a Telegram attachment through mocked fetch and bounds streamed bytes", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token"); vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "admin");
    const transport = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { file_path: "photos/file_1.jpg" } })))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", transport);
    expect((await downloadTelegramTicketFile("file", 10)).buffer.byteLength).toBe(3);
    transport.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { file_path: "photos/file_2.jpg" } })))
      .mockResolvedValueOnce(new Response(new Uint8Array(12)));
    await expect(downloadTelegramTicketFile("file", 10)).rejects.toThrow("20 MB");
  });
  it("does not expose credentials when an attachment download fails", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token"); vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "admin");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("https://api.telegram.org/bottest-token/getFile")));
    await expect(downloadTelegramTicketFile("file", 10)).rejects.toThrow("Could not download this Telegram file");
  });
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "admin");
    vi.stubEnv("PUBLIC_URL", "");
    vi.stubEnv("TELEGRAM_ALLOW_DEV_SEND", "");
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
  it("blocks and logs non-production member messages and photos without any fetch", async () => {
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    expect(await sendTelegramMessageFull("member", "Hello", "HTML", { recipientType: "user", recipientUsername: "member" }))
      .toMatchObject({ ok: false });
    expect(await sendTelegramPhoto("member", "https://example.test/photo.png", "Caption"))
      .toMatchObject({ ok: false });
    expect(transport).not.toHaveBeenCalled();
    expect(logs).toHaveLength(2);
    expect(logs.every(row => row.delivered === false && row.errorMessage === "skipped: non-production server")).toBe(true);
  });
  it.each(["override", "production"])("permits member transport with %s enabled", async mode => {
    if (mode === "override") vi.stubEnv("TELEGRAM_ALLOW_DEV_SEND", "1");
    else vi.stubEnv("PUBLIC_URL", "https://example.test");
    const transport = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: { message_id: 11 } }) });
    vi.stubGlobal("fetch", transport);
    expect(await sendTelegramMessageFull("member", "Hello", "HTML", { recipientType: "user", recipientUsername: "member" }))
      .toMatchObject({ ok: true });
    expect(await sendTelegramPhoto("member", "https://example.test/photo.png", "Caption")).toMatchObject({ ok: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("still sends to the admin chat in development", async () => {
    const transport = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", transport);
    expect(await sendTelegramMessageFull("admin", "Admin test")).toMatchObject({ ok: true });
    expect(await sendTelegramPhoto("admin", "https://example.test/photo.png", "Caption")).toMatchObject({ ok: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
