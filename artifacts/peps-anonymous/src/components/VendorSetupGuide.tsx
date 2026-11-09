import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, RefreshCw } from "lucide-react";
import { vendorFetch } from "@/lib/vendor-auth-client";
import { vendorTranslate as vt, useVendorLanguage } from "@/lib/vendor-language";
import { Badge, Btn, Card, muted } from "./vendor-ui";

export type VendorSetupStep = "username" | "password" | "wallet" | "email" | "telegram";
type Review = { username?: boolean; password?: boolean; email?: boolean; telegram?: boolean; collapsed?: boolean };
type Check = { ready: boolean; error?: boolean; loading?: boolean; unavailable?: boolean; alertsOff?: boolean };
const prefKeys = ["newOrders", "holds", "overdue", "issues", "messages"];
const storageKey = (username: string) => `peps-vendor-setup:${username}`;
function readReview(username: string): Review {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey(username)) ?? "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch { return {}; }
}

/** Read-only setup checks. Credential reviews and optional skips are browser-local,
 * never authentication/permission flags and never a substitute for saved settings. */
export function VendorSetupGuide({ username, walletReady, walletLoading, walletError, onOpenStep, onRefreshWallet }: {
  username: string; walletReady: boolean; walletLoading: boolean; walletError: string | null;
  onOpenStep: (step: VendorSetupStep) => void; onRefreshWallet?: () => unknown;
}) {
  const [language] = useVendorLanguage();
  const [local, setLocal] = useState(() => ({ username, review: readReview(username) }));
  // Do not display another account's checks even for the render before the effect.
  const review = local.username === username ? local.review : readReview(username);
  const [email, setEmail] = useState<Check>({ ready: false, loading: true });
  const [telegram, setTelegram] = useState<Check>({ ready: false, loading: true });
  const [storageError, setStorageError] = useState(false);
  const [revision, setRevision] = useState(0);
  const save = (patch: Partial<Review>) => {
    const next = { ...review, ...patch };
    try { window.localStorage.setItem(storageKey(username), JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
    setLocal({ username, review: next });
  };
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    setLocal({ username, review: readReview(username) }); setStorageError(false);
  }, [username]);
  useEffect(() => {
    const controller = new AbortController();
    const check = async (path: string, parse: (data: any) => Check, set: (value: Check) => void) => {
      set({ ready: false, loading: true });
      try {
        const response = await vendorFetch(`/api/vendor/${path}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Setup check unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) set(parse(data));
      } catch {
        if (!controller.signal.aborted) set({ ready: false, error: true });
      }
    };
    void check("email-settings", data => {
      if (typeof data.verified !== "boolean" || typeof data.enabled !== "boolean") throw new Error("Invalid email settings");
      return { ready: data.verified && data.enabled && (data.newOrders !== false || data.messages !== false), alertsOff: data.verified && (!data.enabled || (data.newOrders === false && data.messages === false)) };
    }, setEmail);
    // Existing portal security requires a saved payment wallet for Telegram routes.
    if (walletReady) {
      void check("telegram", data => {
        if (typeof data.configured !== "boolean" || !Array.isArray(data.chats)) throw new Error("Invalid Telegram settings");
        const enabled = data.chats.some((chat: any) => prefKeys.some(key => chat.prefs?.[key] !== false));
        return { ready: data.configured && enabled, unavailable: !data.configured, alertsOff: data.chats.length > 0 && !enabled };
      }, setTelegram);
    } else setTelegram({ ready: false });
    return () => controller.abort();
  }, [username, walletReady, revision]);
  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("vendor-setup-updated", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("vendor-setup-updated", refresh);
    };
  }, [refresh]);

  const steps: { key: VendorSetupStep; title: string; description: string; optional?: boolean; check?: Check }[] = [
    { key: "username", title: "Review your username", description: "Check your sign-in username. Change it only if you want a different one." },
    { key: "password", title: "Review your password", description: "Make sure you know your password and it is private. You can change it in Settings." },
    { key: "wallet", title: "Add a payment wallet", description: "Save your receiving address with the correct currency and network.", check: { ready: walletReady, loading: walletLoading, error: !!walletError } },
    { key: "email", title: "Set up email notifications", description: "Verify your email, switch alerts on and choose new orders, messages or both.", optional: true, check: email },
    { key: "telegram", title: "Connect Telegram", description: walletReady ? "Open the bot, press Start and choose the alerts you want." : "Save a payment wallet first, then connect Telegram.", optional: true, check: telegram },
  ];
  const done = (step: typeof steps[number]) => step.check?.ready || review[step.key as keyof Review] === true;
  const completed = steps.filter(done).length;
  const countText = language === "zh" ? `已完成 ${completed} / 5 步` : `${completed} of 5 steps finished`;
  return <div className="mb-5" data-testid="vendor-setup-guide">
    <Card title={<><ClipboardCheck className="w-4 h-4" />{vt("Vendor setup")}</>} actions={<button type="button" onClick={() => save({ collapsed: !review.collapsed })} aria-expanded={!review.collapsed} aria-controls="vendor-setup-steps" aria-label={vt(review.collapsed ? "Expand setup guide" : "Collapse setup guide")} data-testid="button-setup-collapse" className="p-1 rounded">
      {review.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
    </button>} testId="card-vendor-setup">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] min-w-0 break-all" data-testid="text-setup-account">{vt("Set up your vendor account")}: <strong>{username}</strong></p>
        <span className="text-xs font-medium" data-testid="text-setup-progress">{countText}</span>
      </div>
      <progress className="w-full h-1.5 mt-3 accent-[#2D6BCC]" value={completed} max={5} aria-label={vt("Setup progress")} />
      {!review.collapsed && <div id="vendor-setup-steps">
        <p className="text-xs mt-3 mb-1" style={muted}>{vt("Email and Telegram are optional. This checklist does not block your orders. Review and skip choices are saved on this browser only.")}</p>
        <ol className="divide-y" style={{ borderColor: "var(--t-border)" }}>
          {steps.map((step, index) => {
            const skipped = step.optional && !step.check?.ready && review[step.key as keyof Review] === true;
            const reviewed = !step.check && review[step.key as keyof Review] === true;
            const status = step.check?.ready ? "Complete" : skipped ? "Skipped" : reviewed ? "Reviewed" : step.check?.loading ? "Checking…" : step.check?.error ? "Could not check" : step.check?.unavailable ? "Not available yet" : step.check?.alertsOff ? "Alerts are off" : step.check ? "To set up" : "To review";
            return <li key={step.key} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`setup-step-${step.key}`}>
              <div className="flex gap-3 flex-1 min-w-0">
                <span className="text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0" style={{ background: "var(--t-surface2)" }}>{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2"><h3 className="text-[13px] font-semibold">{vt(step.title)}</h3>{step.optional && <span className="text-[11px]" style={muted}>{vt("Optional")}</span>}</div>
                  <p className="text-xs mt-1" style={muted}>{vt(step.description)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end pl-9 sm:pl-0">
                <Badge tone={step.check?.ready || reviewed ? "success" : step.check?.error ? "warning" : "neutral"} testId={`status-setup-${step.key}`}>{vt(status)}</Badge>
                <Btn type="button" onClick={() => onOpenStep(step.key)} data-testid={`button-setup-open-${step.key}`}>{vt(step.key === "username" || step.key === "password" ? "Review" : "Open settings")}</Btn>
                {!step.check && !reviewed && <button type="button" onClick={() => save({ [step.key]: true })} className="text-xs underline" data-testid={`button-setup-review-${step.key}`}>{vt("I've reviewed this")}</button>}
                {step.optional && !step.check?.ready && <button type="button" onClick={() => save({ [step.key]: !skipped })} className="text-xs underline" data-testid={`button-setup-skip-${step.key}`}>{vt(skipped ? "Undo skip" : "Skip for now")}</button>}
              </div>
            </li>;
          })}
        </ol>
        <Btn type="button" onClick={() => { refresh(); onRefreshWallet?.(); }} data-testid="button-setup-refresh"><RefreshCw className="w-3.5 h-3.5" />{vt("Refresh setup checks")}</Btn>
        {storageError && <p role="alert" className="text-xs mt-2">{vt("Could not save checklist choices in this browser. Your account settings are unchanged.")}</p>}
      </div>}
    </Card>
  </div>;
}
