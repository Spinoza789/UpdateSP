import { describe, expect, it, vi } from "vitest";
import { createVendorEmailSettingsService, type EmailSettings, type EmailSettingsStore } from "./vendor-email-settings";

function fixture() {
  let row: EmailSettings = { username: "vendor", email: null, enabled: false, verifiedAt: null, pendingEmail: null, codeHash: null, expiresAt: null, attempts: 0 };
  const store: EmailSettingsStore = {
    get: async () => ({ ...row }),
    mutate: async (_username, fn) => { const result = fn({ ...row }); row = { ...row, ...result.patch }; return result.value; },
  };
  const send = vi.fn(async (_email: string, _code: string): Promise<{ ok: boolean; error?: string }> => ({ ok: true }));
  let now = new Date("2026-11-09T00:00:00Z");
  return { store, send, service: createVendorEmailSettingsService(store, send, () => now), row: () => row, advance: () => { now = new Date(now.getTime() + 16 * 60_000); } };
}
describe("vendor notification email verification", () => {
  it("validates addresses and never enables an unverified email", async () => {
    const f = fixture();
    await expect(f.service.start("vendor", "not-email")).rejects.toThrow("valid email");
    await expect(f.service.toggle("vendor", true)).rejects.toThrow("Verify");
    expect(f.send).not.toHaveBeenCalled();
  });
  it("sends a code, hides its hash, verifies it and allows opt out", async () => {
    const f = fixture();
    const pending = await f.service.start("vendor", "Vendor@Example.com");
    expect(pending).toMatchObject({ pendingEmail: "vendor@example.com", enabled: false });
    expect(JSON.stringify(pending)).not.toContain("codeHash");
    const code = f.send.mock.calls[0][1];
    expect(f.row().codeHash).not.toBe(code);
    expect(await f.service.verify("vendor", code)).toMatchObject({ email: "vendor@example.com", verified: true, enabled: true, pendingEmail: null });
    await expect(f.service.verify("vendor", code)).rejects.toThrow("expired");
    expect(await f.service.toggle("vendor", false)).toMatchObject({ enabled: false });
  });
  it("invalidates old codes on resend, limits guesses and expires codes", async () => {
    const f = fixture();
    await f.service.start("vendor", "one@example.com");
    const oldCode = f.send.mock.calls[0][1];
    await f.service.start("vendor", "two@example.com");
    await expect(f.service.verify("vendor", oldCode)).rejects.toThrow("incorrect");
    for (let i = 0; i < 4; i++) await expect(f.service.verify("vendor", "wrong")).rejects.toThrow();
    await expect(f.service.verify("vendor", f.send.mock.calls[1][1])).rejects.toThrow("expired");
    await f.service.start("vendor", "two@example.com");
    f.advance();
    await expect(f.service.verify("vendor", f.send.mock.calls[2][1])).rejects.toThrow("expired");
  });
  it("keeps the existing verified address until a replacement is verified and reports send failure", async () => {
    const f = fixture();
    await f.service.start("vendor", "one@example.com");
    await f.service.verify("vendor", f.send.mock.calls[0][1]);
    f.send.mockResolvedValueOnce({ ok: false, error: "mail unavailable" } as any);
    await expect(f.service.start("vendor", "two@example.com")).rejects.toThrow("Could not send");
    expect(f.row()).toMatchObject({ email: "one@example.com", enabled: true, pendingEmail: null });
  });
});
