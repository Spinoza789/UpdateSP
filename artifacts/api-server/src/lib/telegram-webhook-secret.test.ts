import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mainWebhookSecret, registerTelegramCommands } from "./telegram";

describe("main bot webhook secret", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("derives exactly 48 hex characters from the namespaced bot token", () => {
    expect(mainWebhookSecret("test-token")).toBe(
      createHash("sha256").update("main-webhook:test-token").digest("hex").slice(0, 48),
    );
  });
  it("registers the six supported commands through mocked Telegram", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "admin");
    const transport = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", transport);
    expect(await registerTelegramCommands()).toBe(true);
    expect(JSON.parse(transport.mock.calls[0][1].body).commands.map((command: any) => command.command))
      .toEqual(["start", "menu", "support", "feedback", "cancel", "stop"]);
  });
});
