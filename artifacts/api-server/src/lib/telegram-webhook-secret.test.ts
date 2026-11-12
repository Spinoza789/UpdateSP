import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mainWebhookSecret } from "./telegram";

describe("main bot webhook secret", () => {
  it("derives exactly 48 hex characters from the namespaced bot token", () => {
    expect(mainWebhookSecret("test-token")).toBe(
      createHash("sha256").update("main-webhook:test-token").digest("hex").slice(0, 48),
    );
  });
});
