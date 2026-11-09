import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { VendorPortalError } from "./vendor-portal-model";

export interface EmailSettings {
  username: string; email: string | null; enabled: boolean; verifiedAt: Date | null;
  pendingEmail: string | null; codeHash: string | null; expiresAt: Date | null; attempts: number;
}
export interface EmailSettingsStore {
  get(username: string): Promise<EmailSettings>;
  /** Locks the row and commits even a failed verification's attempt count. */
  mutate<T>(username: string, fn: (row: EmailSettings) => { patch: Partial<EmailSettings>; value: T }): Promise<T>;
}
export const emptyEmailSettings = (username: string): EmailSettings => ({
  username, email: null, enabled: false, verifiedAt: null, pendingEmail: null, codeHash: null, expiresAt: null, attempts: 0,
});
const publicSettings = (row: EmailSettings) => ({
  email: row.email, enabled: row.enabled, verified: !!row.email && !!row.verifiedAt,
  pendingEmail: row.pendingEmail, expiresAt: row.expiresAt,
});
const hashCode = (username: string, code: string) => createHash("sha256").update(`vendor-email:${username}:${code.trim().toUpperCase()}`).digest("hex");
const cleared = { pendingEmail: null, codeHash: null, expiresAt: null, attempts: 0 };
type SettingsResult = { error?: string; settings?: ReturnType<typeof publicSettings> };
type SendCode = (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
export function createVendorEmailSettingsService(store: EmailSettingsStore, send: SendCode, clock = () => new Date()) {
  return {
    async get(username: string) { return publicSettings(await store.get(username)); },
    async start(username: string, input: unknown) {
      if (typeof input !== "string" || input.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) throw new VendorPortalError("Enter a valid email address.");
      const email = input.trim().toLowerCase();
      const code = randomBytes(4).toString("hex").toUpperCase();
      const codeHash = hashCode(username, code);
      const pending = await store.mutate(username, row => {
        const patch = { pendingEmail: email, codeHash, expiresAt: new Date(clock().getTime() + 15 * 60_000), attempts: 0 };
        return { patch, value: publicSettings({ ...row, ...patch }) };
      });
      let sent: { ok: boolean };
      try { sent = await send(email, code); } catch { sent = { ok: false }; }
      if (!sent.ok) {
        await store.mutate(username, row => ({ patch: row.codeHash === codeHash ? cleared : {}, value: null }));
        throw new VendorPortalError("Could not send the verification email. Please try again later.", 503);
      }
      return pending;
    },
    async verify(username: string, input: unknown) {
      const result = await store.mutate<SettingsResult>(username, row => {
        const now = clock();
        if (!row.pendingEmail || !row.codeHash || !row.expiresAt || row.expiresAt <= now || row.attempts >= 5) {
          return { patch: cleared, value: { error: "Verification code expired. Request a new code." } };
        }
        const candidate = hashCode(username, typeof input === "string" ? input.slice(0, 64) : "");
        if (!timingSafeEqual(Buffer.from(candidate), Buffer.from(row.codeHash))) {
          return { patch: { attempts: row.attempts + 1 }, value: { error: "Verification code is incorrect." } };
        }
        const patch = { ...cleared, email: row.pendingEmail, enabled: true, verifiedAt: now };
        return { patch, value: { settings: publicSettings({ ...row, ...patch }) } };
      });
      if (result.error) throw new VendorPortalError(result.error);
      return result.settings!;
    },
    async toggle(username: string, enabled: unknown) {
      if (typeof enabled !== "boolean") throw new VendorPortalError("Choose whether to enable email notifications.");
      const result = await store.mutate<SettingsResult>(username, row => {
        if (enabled && (!row.email || !row.verifiedAt)) return { patch: {}, value: { error: "Verify your email address first." } };
        // Starting a subscription must not email notifications from its disabled interval.
        const patch = { enabled, ...(enabled && !row.enabled ? { verifiedAt: clock() } : {}) };
        return { patch, value: { settings: publicSettings({ ...row, ...patch }) } };
      });
      if (result.error) throw new VendorPortalError(result.error);
      return result.settings!;
    },
    async cancel(username: string) {
      return store.mutate(username, row => ({ patch: cleared, value: publicSettings({ ...row, ...cleared }) }));
    },
  };
}
