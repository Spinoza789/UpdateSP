import { useEffect, useRef, useState, type FormEvent } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { clearVendorCsrfToken, vendorFetch } from "@/lib/vendor-auth-client";
import { vendorTranslate as vt, useVendorLanguage } from "@/lib/vendor-language";
import { Banner, Btn, Card, Field, field, fieldCls, muted } from "./vendor-ui";

interface EmailSettings {
  email: string | null; enabled: boolean; verified: boolean;
  pendingEmail: string | null; expiresAt: string | null;
}
async function request(path: string, body?: unknown, signal?: AbortSignal) {
  const res = await vendorFetch(`/api/vendor/${path}`, body === undefined ? { signal } : {
    method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || vt("Could not save settings"));
  return data;
}
export function VendorAccountSettings({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  useVendorLanguage();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data: EmailSettings = await request("email-settings", undefined, signal);
      if (active.current && !signal?.aborted) { setSettings(data); setEmail(data.pendingEmail || data.email || ""); setEmailMessage(null); }
    } catch (error) {
      if (active.current && !signal?.aborted) setEmailMessage({ ok: false, text: error instanceof Error ? error.message : vt("Could not load settings") });
    } finally { if (active.current && !signal?.aborted) setLoading(false); }
  };
  useEffect(() => {
    active.current = true;
    const abort = new AbortController();
    void load(abort.signal);
    return () => { active.current = false; abort.abort(); controller.current?.abort(); };
  }, []);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setPasswordError(null);
    if (newPassword !== confirmPassword) { setPasswordError(vt("New passwords do not match.")); return; }
    if (newPassword.length < 12 || new TextEncoder().encode(newPassword).length > 72) { setPasswordError(vt("Use at least 12 characters and at most 72 UTF-8 bytes.")); return; }
    setBusy("password"); controller.current = new AbortController();
    try {
      await request("auth/change-password", { currentPassword, newPassword, confirmPassword }, controller.current.signal);
      clearVendorCsrfToken();
      if (active.current) { setCurrent(""); setNew(""); setConfirm(""); onPasswordChanged(); }
    } catch (error) {
      if (active.current) setPasswordError(error instanceof Error ? error.message : vt("Could not save settings"));
    } finally { if (active.current) setBusy(null); }
  };
  const emailAction = async (action: string, body: unknown) => {
    if (busy) return;
    setBusy(action); setEmailMessage(null); controller.current = new AbortController();
    try {
      const data: EmailSettings = await request(`email-settings/${action}`, body, controller.current.signal);
      if (!active.current) return;
      setSettings(data); setCode("");
      if (action === "cancel") setEmail(data.email || "");
      setEmailMessage({ ok: true, text: vt(action === "start" ? "Verification code sent. Check your inbox and spam folder." : action === "verify" ? "Email verified. New order and message alerts are enabled." : "Email notification settings saved.") });
    } catch (error) {
      if (active.current) setEmailMessage({ ok: false, text: error instanceof Error ? error.message : vt("Could not save settings") });
    } finally { if (active.current) setBusy(null); }
  };
  return <div className="space-y-4 mb-6">
    <Card title={<><KeyRound className="w-4 h-4" />{vt("Change password")}</>} testId="card-vendor-password">
      <p className="text-[13px] mb-4" style={muted}>{vt("Changing your password signs out all vendor sessions. Your username, orders and two-factor settings stay unchanged.")}</p>
      {passwordError && <Banner tone="critical" role="alert" testId="text-vendor-password-error">{vt(passwordError)}</Banner>}
      <form onSubmit={changePassword} className="space-y-3 mt-3" data-testid="form-vendor-password">
        <Field label={vt("Current password")}><input type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrent(e.target.value)} disabled={!!busy} className={fieldCls} style={field} data-testid="input-vendor-current-password" /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={vt("New password")}><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={e => setNew(e.target.value)} disabled={!!busy} className={fieldCls} style={field} data-testid="input-vendor-new-password" /></Field>
          <Field label={vt("Confirm new password")}><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={e => setConfirm(e.target.value)} disabled={!!busy} className={fieldCls} style={field} data-testid="input-vendor-confirm-password" /></Field>
        </div>
        <p className="text-xs" style={muted}>{vt("Use at least 12 characters and at most 72 UTF-8 bytes.")}</p>
        <Btn type="submit" variant="primary" disabled={!!busy} data-testid="button-vendor-change-password">{busy === "password" && <Loader2 className="w-4 h-4 animate-spin" />}{vt("Change password and sign out")}</Btn>
      </form>
    </Card>
    <Card title={<><Mail className="w-4 h-4" />{vt("Email notifications")}</>} testId="card-vendor-email">
      <p className="text-[13px] mb-3" style={muted}>{vt("New orders and messages only. Telegram notifications are unchanged. Verify your email before alerts can start.")}</p>
      {emailMessage && <Banner tone={emailMessage.ok ? "success" : "critical"} role={emailMessage.ok ? "status" : "alert"} testId="text-vendor-email-result">{vt(emailMessage.text)}</Banner>}
      {loading ? <p role="status" className="text-sm">{vt("Loading settings…")}</p> : !settings ? <Btn type="button" onClick={() => void load()} data-testid="button-vendor-email-retry">{vt("Retry")}</Btn> : <>
        {settings.email && <p className="text-[13px] mt-3 break-all" data-testid="text-vendor-verified-email">{vt(settings.verified ? "Verified" : "Not verified")}: {settings.email}</p>}
        <form onSubmit={e => { e.preventDefault(); void emailAction("start", { email }); }} className="space-y-3 mt-3" data-testid="form-vendor-email">
          <Field label={vt("Notification email address")}><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} disabled={!!busy} className={fieldCls} style={field} data-testid="input-vendor-email" /></Field>
          <Btn type="submit" disabled={!!busy || !email.trim()} data-testid="button-vendor-email-send-code">{busy === "start" && <Loader2 className="w-4 h-4 animate-spin" />}{vt(settings.pendingEmail ? "Send a new verification code" : "Send verification code")}</Btn>
        </form>
        {settings.pendingEmail && <form onSubmit={e => { e.preventDefault(); void emailAction("verify", { code }); }} className="space-y-3 mt-4 border-t pt-4" style={{ borderColor: "var(--t-border)" }} data-testid="form-vendor-email-code">
          <p className="text-[13px] break-all" style={muted}>{vt("Enter the code sent to")} {settings.pendingEmail}. {vt("Codes expire in 15 minutes.")}</p>
          <Field label={vt("Verification code")}><input autoComplete="one-time-code" maxLength={8} required value={code} onChange={e => setCode(e.target.value.toUpperCase())} disabled={!!busy} className={fieldCls} style={field} data-testid="input-vendor-email-code" /></Field>
          <div className="flex flex-wrap gap-2">
            <Btn type="submit" variant="primary" disabled={!!busy || !code.trim()} data-testid="button-vendor-email-verify">{vt("Verify email")}</Btn>
            <Btn type="button" disabled={!!busy} onClick={() => void emailAction("cancel", {})} data-testid="button-vendor-email-cancel">{vt("Cancel")}</Btn>
          </div>
        </form>}
        <label className="flex items-start gap-2 text-[13px] mt-4">
          <input type="checkbox" className="mt-0.5" checked={settings.enabled} disabled={!!busy || !settings.verified} onChange={e => void emailAction("toggle", { enabled: e.target.checked })} data-testid="checkbox-vendor-email-enabled" />
          {vt("Email me about new orders and messages")}
        </label>
      </>}
    </Card>
  </div>;
}
