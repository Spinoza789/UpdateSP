import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle, BarChart3, Store, Send, Eye, ArrowDownRight, ArrowLeft, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock, Copy,
  Download, Home, Landmark, Loader2, LogOut, Menu, Package, PackageCheck, PauseCircle, Printer, RefreshCw, Search, ShieldCheck, Truck, Undo2, X,
} from "lucide-react";
import { AdminApiError, AdminSessionExpiredError, retryAdminAvailability } from "@/lib/admin-auth";
import { pepsAdminAuth, pepsAdminJson } from "@/lib/peps-admin";
import { Badge, Banner, Btn, Card, Field, TONES, type Progress, type Tone, cardStyle, field, fieldCls, muted, subtle } from "@/components/vendor-ui";
import { AdditionalTrackingParcels, TrackingParcelList, vendorTrackingParcels, type VendorTrackingParcel } from "@/components/VendorTrackingParcels";
import VendorPaymentsAdmin from "@/components/admin/VendorPaymentsAdmin";
import { RevenueProfitReport } from "@/components/admin/peps-anon-payment/RevenueProfitReport";
import { OrderComparison } from "@/components/admin/peps-anon-payment/OrderComparison";
import { vendorAddressLines } from "@/lib/vendor-address";
import { vendorPackingSlipHtml } from "@/lib/vendor-packing-slip";
import { downloadVendorOrdersCsv } from "@/lib/vendor-orders-csv";
import { VendorPortalPreview, type VendorOrder, type VendorPreviewPayment, type VendorPreviewWallet } from "./VendorPortal";
import "@/components/admin/peps-anon-payment/payments.css";

/* Peps Anonymous admin workspace. Deliberately mirrors the vendor portal (pages/VendorPortal.tsx):
 * same shell, cards, tables and badges, so staff and vendors look at the same screens. */

type Item = { productName: string; quantity: number; unitCost: string; lineTotal: string };
type Image = { id: string; filename: string; url: string; createdAt: string };
type Order = {
  id: string; reference: string; status: string; submittedAt: string; stale: boolean;
  vendorId: string; vendorName: string; items: Item[]; currency: "USD";
  productCost: string; shippingCost: string; totalCost: string;
  shipping: { name: string; address: string; country: string; phone: string; email: string };
  trackingNumber: string | null; carrier: string | null; images: Image[];
  trackingPackages?: VendorTrackingParcel[];
};
type Vendor = { id: string; name: string };
type ListResult = { vendors: Vendor[]; orders: Order[]; total: number; page: number; limit: number };
type AuthView = "boot" | "retry" | "login" | "workspace";
type View = "home" | "orders" | "analytics" | "payments" | "telegram";
type StageKey = "new" | "process" | "ship" | "hold" | "terminal";
type Sort = "newest" | "oldest" | "value";
const LIMIT = 50;
const OVERDUE_HOURS = 48;
const money = (v: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
const date = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };
/** Same relative stamp as the vendor portal: "Today at 10:12", "Yesterday at 16:40", "12 Oct at 09:03". */
function when(v: string) {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const clock = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today at ${clock}`;
  if (diffDays === 1) return `Yesterday at ${clock}`;
  return `${d.toLocaleDateString("en-GB", { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) })} at ${clock}`;
}
function age(v: string) {
  const at = new Date(v).getTime();
  if (!v || Number.isNaN(at)) return "";
  const h = Math.floor((Date.now() - at) / 3_600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
const units = (o: Order) => o.items.reduce((n, i) => n + i.quantity, 0);
const time = (o: Order) => new Date(o.submittedAt).getTime() || 0;
const terminalStatus = (o: Order) => /complete|refund|cancel/i.test(o.status);
const stageKey = (o: Order): StageKey => o.stale ? "hold" : terminalStatus(o) ? "terminal" : o.trackingNumber || /ship/i.test(o.status) ? "ship" : /process/i.test(o.status) ? "process" : "new";
const STAGES: { key: Exclude<StageKey, "terminal">; label: string; tone: Tone; progress: Progress }[] = [
  { key: "new", label: "Unfulfilled", tone: "attention", progress: "incomplete" },
  { key: "process", label: "In progress", tone: "info", progress: "partial" },
  { key: "ship", label: "Fulfilled", tone: "success", progress: "complete" },
  { key: "hold", label: "On hold", tone: "warning", progress: "incomplete" },
];
const stageLabel = (o: Order) => { const k = stageKey(o); return k === "terminal" ? (/refund/i.test(o.status) ? "Refunded" : /cancel/i.test(o.status) ? "Cancelled" : "Completed") : STAGES.find(s => s.key === k)!.label; };
const isOpen = (o: Order) => { const k = stageKey(o); return k === "new" || k === "process"; };
const overdue = (o: Order) => isOpen(o) && !!time(o) && Date.now() - time(o) > OVERDUE_HOURS * 3_600_000;
function StageBadge({ order }: { order: Order }) {
  const meta = STAGES.find(s => s.key === stageKey(order));
  return <Badge tone={meta?.tone ?? "neutral"} progress={meta?.progress ?? "complete"} testId="status-order">{stageLabel(order)}</Badge>;
}
const ctaFor = (k: StageKey) => k === "new" ? "Start" : k === "process" ? "Add tracking" : "View";
// Each parcel row carries the full carrier list, so skip re-rendering it when unrelated workspace state changes.
const ExtraParcels = memo(AdditionalTrackingParcels);
const orderUrl = (id: string) => `/admin/vendor-portal/orders/${encodeURIComponent(id)}`;
const needsOverride = (o: Order) => !!o.trackingNumber || o.images.length > 0 || /process|ship/i.test(o.status);
/** JSON request through this workspace's admin session, in the shape the shared report components expect. */
async function reportRequest(path: string, init?: RequestInit) {
  const response = await pepsAdminAuth.request(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
function errorMessage(e: unknown) { return e instanceof Error ? e.message : "Something went wrong. Please try again."; }
function printPackingSlip(o: Order) {
  const w = window.open("", "_blank", "width=440,height=720");
  if (!w) return;
  w.document.write(vendorPackingSlipHtml(o));
  w.document.close(); w.focus(); setTimeout(() => w.print(), 200);
}

export default function PepsAdmin() {
  const [authView, setAuthView] = useState<AuthView>("boot");
  const [twoFactor, setTwoFactor] = useState(false);
  const [authError, setAuthError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const identityEpoch = useRef(0);
  const listGen = useRef(0);
  const detailGen = useRef(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const expiredHandler = useRef<() => void>(() => undefined);
  expiredHandler.current = () => {
    identityEpoch.current++;
    listGen.current++;
    detailGen.current++;
    setAuthView("login");
    setAuthError("Your admin session expired. Sign in again.");
    setPreviewVendor(null);
    setOrders([]);
    setVendors([]);
    setTotal(0);
    setDetail(null);
    setSelectedId(null);
    setVendorId("");
    setPage(1);
    setQuery("");
    setStatusFilter("all");
    setDialog(null);
    setPreview(null);
    setPreviewError("");
    setOrderCodes("");
    setPassword("");
    setUsername("");
    setCode("");
    setChallenge("");
    setRecovery(false);
    setRemember(false);
    setListLoading(false);
    setDetailLoading(false);
    setMutationBusy(false);
    setPreviewLoading(false);
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    pepsAdminAuth.onSessionExpired = () => expiredHandler.current();
    setAuthView("boot");
    (async () => {
      try {
        const status = await retryAdminAvailability(() => pepsAdminAuth.initialize(), controller.signal, 5, 90_000);
        if (!active) return;
        setTwoFactor(status.twoFactorEnabled);
        try {
          await retryAdminAvailability(() => pepsAdminAuth.restoreSession(), controller.signal, 5, 90_000);
          if (active) setAuthView("workspace");
        } catch (e) {
          if (!active) return;
          if (e instanceof AdminSessionExpiredError || (e instanceof AdminApiError && e.response.status === 401)) setAuthView("login");
          else { setAuthError(errorMessage(e)); setAuthView("retry"); }
        }
      } catch (e) {
        if (!active) return;
        if (e instanceof AdminApiError && e.response.status === 401) setAuthView("login");
        else { setAuthError(errorMessage(e)); setAuthView("retry"); }
      }
    })();
    return () => {
      active = false;
      controller.abort();
      if (pepsAdminAuth.onSessionExpired) pepsAdminAuth.onSessionExpired = undefined;
    };
  }, [retryTick]);

  const [vendorId, setVendorId] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StageKey | "all">("all");
  const [view, setView] = useState<View>("home");
  const [sort, setSort] = useState<Sort>("newest");
  const [previewVendor, setPreviewVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [extraParcels, setExtraParcels] = useState<VendorTrackingParcel[]>([]);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dialog, setDialog] = useState<"recall" | "resubmit" | null>(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [orderCodes, setOrderCodes] = useState("");
  const [preview, setPreview] = useState<{ shipments: Order[]; previewToken: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const loadList = useCallback(async (signal?: AbortSignal) => {
    const generation = ++listGen.current;
    const epoch = identityEpoch.current;
    setListLoading(true); setListError("");
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (vendorId) params.set("vendorId", vendorId);
    try {
      const result = await pepsAdminJson<ListResult>(`/admin/vendor-portal/orders?${params}`, { signal });
      if (signal?.aborted || generation !== listGen.current || epoch !== identityEpoch.current) return;
      setOrders(result.orders); setVendors(result.vendors); setTotal(result.total); setUpdatedAt(new Date());
    } catch (e) {
      if (signal?.aborted || generation !== listGen.current || epoch !== identityEpoch.current) return;
      setListError(errorMessage(e));
    } finally {
      if (!signal?.aborted && generation === listGen.current && epoch === identityEpoch.current) setListLoading(false);
    }
  }, [page, vendorId]);

  useEffect(() => {
    if (authView !== "workspace") return;
    const abort = new AbortController();
    void loadList(abort.signal);
    return () => { abort.abort(); listGen.current++; };
  }, [authView, loadList]);

  const loadDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    const generation = ++detailGen.current;
    const epoch = identityEpoch.current;
    setDetailLoading(true); setDetailError("");
    try {
      const result = await pepsAdminJson<Order>(orderUrl(id), { signal });
      if (signal?.aborted || generation !== detailGen.current || selectedId !== id || epoch !== identityEpoch.current || (vendorId && result.vendorId !== vendorId)) return;
      setDetail(result);
    } catch (e) {
      if (signal?.aborted || generation !== detailGen.current || selectedId !== id || epoch !== identityEpoch.current) return;
      setDetailError(errorMessage(e));
    } finally {
      if (!signal?.aborted && generation === detailGen.current && selectedId === id && epoch === identityEpoch.current) setDetailLoading(false);
    }
  }, [selectedId, vendorId]);
  useEffect(() => {
    if (!selectedId || authView !== "workspace") { setDetail(null); return; }
    const abort = new AbortController();
    setDetail(null);
    void loadDetail(selectedId, abort.signal);
    return () => { abort.abort(); detailGen.current++; };
  }, [selectedId, authView, loadDetail]);
  useEffect(() => {
    if (!detail || detail.id !== selectedId) return;
    setTrackingNumber(detail.trackingNumber ?? "");
    setCarrier(detail.carrier ?? "");
    setExtraParcels(vendorTrackingParcels(detail).slice(1));
  }, [detail, selectedId]);

  // Keep the workspace current like the vendor portal does, without interrupting a dialog or an open shipment.
  useEffect(() => {
    // Never start a refresh while a load is in flight: a newer request discards the older response,
    // so a slow list would otherwise be restarted forever and never appear.
    if (authView !== "workspace" || selectedId || dialog || listLoading) return;
    const timer = setTimeout(() => { void loadList(); }, 30_000);
    return () => clearTimeout(timer);
  }, [authView, selectedId, dialog, listLoading, updatedAt, loadList]);

  const filtered = useMemo(() => orders.filter(o => {
    const matchesStatus = statusFilter === "all" || stageKey(o) === statusFilter;
    const q = query.trim().toLowerCase();
    return matchesStatus && (!q || [o.reference, o.vendorName, o.shipping.name, o.shipping.country, ...vendorTrackingParcels(o).map(p => p.internationalTrackingNumber), ...o.items.map(i => i.productName)].some(x => x.toLowerCase().includes(q)));
  }).sort((a, b) => sort === "value" ? Number(b.totalCost) - Number(a.totalCost) : sort === "oldest" ? time(a) - time(b) : time(b) - time(a)), [orders, query, statusFilter, sort]);
  const counts = useMemo(() => {
    const c = { all: orders.length, new: 0, process: 0, ship: 0, hold: 0, terminal: 0, overdue: 0 };
    for (const o of orders) { c[stageKey(o)]++; if (overdue(o)) c.overdue++; }
    return c;
  }, [orders]);
  // Home: the oldest shipments still waiting on a vendor.
  const attention = useMemo(() => orders.filter(isOpen).sort((a, b) => time(a) - time(b)).slice(0, 6), [orders]);
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  const visibleDetail = detail && detail.id === selectedId ? detail : null;

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setAuthBusy(true); setAuthError("");
    try {
      if (!twoFactor) {
        await pepsAdminAuth.loginWithSecret(password, remember);
        identityEpoch.current++;
        resetWorkspaceView();
        setPassword(""); setAuthView("workspace");
      } else if (!challenge) {
        const nextChallenge = await pepsAdminAuth.login(username.trim(), password, remember);
        setPassword(""); setChallenge(nextChallenge);
      } else {
        await pepsAdminAuth.verify(challenge, recovery ? { recoveryCode: code.trim() } : { code: code.trim() });
        identityEpoch.current++;
        resetWorkspaceView();
        setCode(""); setChallenge(""); setRecovery(false); setAuthView("workspace");
      }
    } catch (e) { setAuthError(errorMessage(e)); }
    finally { setAuthBusy(false); }
  };
  const signOut = async () => {
    setAuthBusy(true); setActionError("");
    try { await pepsAdminAuth.logout(); expiredHandler.current(); setAuthError(""); }
    catch (e) { setActionError(`Sign out failed: ${errorMessage(e)}`); }
    finally { setAuthBusy(false); }
  };

  const mutate = async (id: string, body: object) => {
    const epoch = identityEpoch.current;
    setMutationBusy(true); setActionError("");
    try {
      await pepsAdminJson<{ ok: true }>(orderUrl(id), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (epoch !== identityEpoch.current) return;
      await Promise.all([loadList(), loadDetail(id)]);
    } catch (e) { if (epoch === identityEpoch.current) setActionError(errorMessage(e)); }
    finally { if (epoch === identityEpoch.current) setMutationBusy(false); }
  };
  const startProcessing = () => detail && !detail.stale && !/complete|refund/i.test(detail.status) && !/ship/i.test(detail.status) && void mutate(detail.id, { action: "processing" });
  const saveTracking = () => {
    if (!detail || detail.stale || !trackingNumber.trim() || !carrier.trim()) return;
    if (extraParcels.some(p => !p.courier.trim() || !p.internationalTrackingNumber.trim())) {
      setActionError("Enter a tracking number and carrier for every parcel."); return;
    }
    const primary = vendorTrackingParcels(detail)[0];
    void mutate(detail.id, { action: "tracking", expectedTrackingPackages: vendorTrackingParcels(detail), trackingPackages: [{
      id: primary?.id ?? "legacy-0", localTrackingNumber: primary?.localTrackingNumber ?? null,
      internationalTrackingNumber: trackingNumber.trim(), courier: carrier.trim(),
    }, ...extraParcels.map(p => ({ ...p, courier: p.courier.trim(), internationalTrackingNumber: p.internationalTrackingNumber.trim() }))] });
  };
  const recall = async () => {
    if (!detail) return;
    const epoch = identityEpoch.current;
    setMutationBusy(true); setActionError("");
    try {
      await pepsAdminJson<{ ok: true }>(orderUrl(detail.id), { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ override, reason: reason.trim() }) });
      if (epoch !== identityEpoch.current) return;
      setDialog(null); setReason(""); setOverride(false); setSelectedId(null);
      await loadList();
    } catch (e) { if (epoch === identityEpoch.current) setActionError(errorMessage(e)); }
    finally { if (epoch === identityEpoch.current) setMutationBusy(false); }
  };
  const requestPreview = async (event: FormEvent) => {
    event.preventDefault(); setPreviewLoading(true); setPreviewError(""); setPreview(null);
    const codes = orderCodes.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    if (!vendorId || !codes.length) { setPreviewError("Choose a vendor and enter at least one order number."); setPreviewLoading(false); return; }
    const epoch = identityEpoch.current;
    try {
      const data = await pepsAdminJson<{ shipments: Order[]; previewToken: string }>("/admin/vendor-portal/preview", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vendorId, orderCodes: codes }),
      });
      if (epoch !== identityEpoch.current) return;
      setPreview(data);
    } catch (e) { if (epoch === identityEpoch.current) setPreviewError(errorMessage(e)); }
    finally { if (epoch === identityEpoch.current) setPreviewLoading(false); }
  };
  const submitPreview = async () => {
    if (!preview || !vendorId) return;
    const epoch = identityEpoch.current;
    setMutationBusy(true); setPreviewError("");
    try {
      const codes = orderCodes.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
      await pepsAdminJson("/admin/vendor-portal/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vendorId, orderCodes: codes, previewToken: preview.previewToken }) });
      if (epoch !== identityEpoch.current) return;
      setDialog(null); setPreview(null); setOrderCodes(""); await loadList();
      if (selectedId) await loadDetail(selectedId);
    } catch (e) { if (epoch === identityEpoch.current) setPreviewError(errorMessage(e)); }
    finally { if (epoch === identityEpoch.current) setMutationBusy(false); }
  };

  function resetWorkspaceView() {
    listGen.current++; detailGen.current++;
    setOrders([]); setVendors([]); setTotal(0); setDetail(null); setSelectedId(null);
    setVendorId(""); setPage(1); setQuery(""); setStatusFilter("all");
    setDialog(null); setPreview(null); setPreviewError(""); setOrderCodes(""); setActionError("");
    setTrackingNumber(""); setCarrier(""); setListError(""); setDetailError("");
    setListLoading(false); setDetailLoading(false); setMutationBusy(false); setPreviewLoading(false);
  }
  const onNav = (next: View, stage?: StageKey | "all") => { setView(next); if (stage) setStatusFilter(stage); setSelectedId(null); };
  const onGlobalQuery = (q: string) => { setQuery(q); if (view !== "orders" || selectedId) { setView("orders"); setStatusFilter("all"); setSelectedId(null); } };
  const changeVendor = (id: string) => { setVendorId(id); setPage(1); setOrders([]); setTotal(0); setSelectedId(null); setDetail(null); detailGen.current++; };
  const openSubmit = () => { setDialog("resubmit"); setPreview(null); setPreviewError(""); };

  if (authView === "boot" || authView === "retry") return <Gate>
    {authView === "boot" ? <section className="p-6 space-y-3" style={cardStyle} aria-label="Checking admin session">{[0, 1, 2].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</section> :
      <section className="p-6 md:p-8 space-y-3" style={cardStyle} role="alert">
        <h1 className="text-xl font-semibold tracking-tight">Admin workspace unavailable</h1>
        <p className="text-[13px]" style={muted}>{authError || "We couldn’t check your session right now."} Your sign-in has not been cleared.</p>
        <Btn variant="primary" className="h-9" onClick={() => setRetryTick(n => n + 1)}>Try again</Btn>
      </section>}
  </Gate>;
  if (authView === "login") return <Gate>
    <form className="p-6 md:p-8 space-y-4" style={cardStyle} onSubmit={signIn}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={subtle}><ShieldCheck className="w-3.5 h-3.5" />Peps staff access</p>
        <h1 className="text-xl font-semibold tracking-tight mt-0.5">{challenge ? "Verify it’s you" : "Sign in to the admin panel"}</h1>
        <p className="text-[13px] mt-1" style={muted}>{challenge ? (recovery ? "Enter one unused recovery code." : "Enter the verification code from your authenticator.") : "Submit, track and pay wholesale orders from one place."}</p>
      </div>
      {authError && <Banner tone="critical" role="alert">{authError}</Banner>}
      {twoFactor && !challenge && <Field label="Username"><input className={`${fieldCls} h-9`} style={field} autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} required /></Field>}
      {challenge ? <Field label={recovery ? "Recovery code" : "Authentication code"}><input className={`${fieldCls} h-9 font-mono tracking-[0.25em] text-center`} style={field} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} required autoFocus /></Field> :
        <Field label={twoFactor ? "Password" : "Admin password"}><input className={`${fieldCls} h-9`} style={field} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></Field>}
      <label className="flex items-center gap-2 text-xs" style={muted}><input type="checkbox" className="w-4 h-4 accent-[#1A1A1A]" checked={remember} onChange={e => setRemember(e.target.checked)} /> Keep me signed in</label>
      <Btn type="submit" variant="primary" className="w-full h-9" disabled={authBusy}>{authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}{challenge ? "Verify and continue" : "Sign in"}</Btn>
      {challenge && <button type="button" className="block mx-auto text-xs font-medium underline" style={muted} onClick={() => { setRecovery(v => !v); setCode(""); }}>{recovery ? "Use authenticator code" : "Use a recovery code"}</button>}
    </form>
  </Gate>;

  if (previewVendor) return <VendorPreview key={previewVendor.id} vendor={previewVendor} onExit={() => setPreviewVendor(null)} />;

  const vendorName = vendorId ? vendors.find(v => v.id === vendorId)?.name ?? "Selected vendor" : "All vendors";
  const updated = updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · refreshes every 30s` : "Loading orders…";
  const scopeNote = total > orders.length ? `Showing the ${orders.length} most recent of ${total.toLocaleString()} orders on this page.` : "";
  const vendorSelect = <select value={vendorId} onChange={e => changeVendor(e.target.value)} aria-label="Filter by vendor" className={`${fieldCls} w-auto max-w-[180px]`} style={field} data-testid="select-vendor">
    <option value="">All vendors</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>;
  const refreshBtn = <Btn onClick={() => void loadList()} disabled={listLoading} aria-label="Refresh orders" data-testid="button-refresh" className="!px-2"><RefreshCw className={`w-4 h-4 ${listLoading ? "animate-spin" : ""}`} /></Btn>;
  const submitBtn = <Btn variant="primary" onClick={openSubmit} data-testid="button-resubmit"><PackageCheck className="w-4 h-4" />Submit orders</Btn>;
  const errorBanner = actionError && !selectedId ? <div className="mb-4"><Banner tone="critical" role="alert" onDismiss={() => setActionError("")}>{actionError}</Banner></div> : null;
  const listErrorBanner = listError ? <div className="mb-4"><Banner tone="critical" role="alert" testId="text-list-error">{listError} <button onClick={() => void loadList()} className="font-semibold underline ml-1">Retry</button></Banner></div> : null;
  const ready = !(listLoading && orders.length === 0) || !!listError;
  const navList = view === "home" ? attention : filtered;
  const index = selectedId ? navList.findIndex(o => o.id === selectedId) : -1;

  let body: ReactNode;
  if (view === "payments") body = (
    <div className="max-w-[1320px] mx-auto">
      <PageHeader title="Payments" subtitle="Vendor wallets, what is owed on each wholesale order, and receipts for transfers you have sent." />
      {errorBanner}
      <VendorPaymentsAdmin auth={pepsAdminAuth} heading={false} reports={false} vendorId={vendorId} />
    </div>
  );
  else if (view === "telegram") body = <TelegramLogView vendors={vendors} vendorId={vendorId} vendorSelect={vendorSelect} banners={errorBanner} />;
  else if (view === "analytics") body = (
    <AnalyticsView vendors={vendors} vendorId={vendorId} onVendor={changeVendor} orders={orders} total={total} ready={ready}
      actions={<>{vendorSelect}{refreshBtn}</>} banners={<>{errorBanner}{listErrorBanner}</>} onOpenOrders={() => onNav("orders", "all")} />
  );
  else if (selectedId) body = (
    <DetailView order={visibleDetail} loading={detailLoading} error={detailError} onBack={() => setSelectedId(null)} onRetry={() => void loadDetail(selectedId)}
      trackingNumber={trackingNumber} setTrackingNumber={setTrackingNumber} carrier={carrier} setCarrier={setCarrier} extraParcels={extraParcels} setExtraParcels={setExtraParcels}
      busy={mutationBusy} actionError={actionError} onDismissError={() => setActionError("")} onProcess={startProcessing} onTracking={saveTracking}
      onRecall={() => { setDialog("recall"); setReason(""); setOverride(false); }} onPayments={() => onNav("payments")}
      prev={index > 0 ? navList[index - 1] : null} next={index >= 0 && index < navList.length - 1 ? navList[index + 1] : null} onOpen={setSelectedId} />
  );
  else if (view === "home") body = (
    <HomeView orders={orders} ready={ready} counts={counts} attention={attention} vendorName={vendorName} updated={updated} scopeNote={scopeNote}
      actions={<>{vendorSelect}{refreshBtn}{submitBtn}</>} banners={<>{errorBanner}{listErrorBanner}</>} onNav={onNav} onOpen={setSelectedId} onSubmit={openSubmit} />
  );
  else body = (
    <div className="max-w-[1120px] mx-auto">
      <PageHeader title="Orders" subtitle={`${vendorName} · ${updated}`} actions={<>
        <Btn onClick={() => downloadVendorOrdersCsv(filtered)} disabled={!filtered.length} data-testid="button-export-csv" title="Exports the orders in the current view"><Download className="w-4 h-4" />Export</Btn>
        {refreshBtn}{submitBtn}
      </>} />
      {errorBanner}
      {counts.overdue > 0 && <div className="mb-4"><Banner tone="critical" testId="text-overdue">{counts.overdue} order{counts.overdue === 1 ? " has" : "s have"} been waiting more than {OVERDUE_HOURS} hours without tracking.</Banner></div>}
      <Card flush>
        <div className="flex items-center gap-1 overflow-x-auto px-3 pt-3 pb-2" role="tablist">
          {(["all", ...STAGES.map(s => s.key)] as const).map(key => {
            const on = statusFilter === key;
            return <button key={key} role="tab" aria-selected={on} onClick={() => setStatusFilter(key)} data-testid={`button-filter-${key}`}
              className="h-8 px-3 rounded-lg text-[13px] whitespace-nowrap flex items-center gap-1.5 hover:bg-[var(--t-surface2)]"
              style={{ background: on ? "var(--t-surface2)" : undefined, color: on ? "var(--t-text)" : "var(--t-muted)", fontWeight: on ? 600 : 500 }}>
              {key === "all" ? "All" : STAGES.find(s => s.key === key)!.label}
              <span className="tabular-nums text-xs px-1.5 rounded-md" style={{ background: on ? "var(--t-surface)" : "var(--t-surface2)", border: "1px solid var(--t-border)", ...subtle }}>{counts[key]}</span>
            </button>;
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 px-3 pb-3" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <label className="relative flex-1">
            <span className="sr-only">Search orders</span>
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2" style={subtle} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by reference, vendor, recipient, product or tracking" className={`${fieldCls} pl-8`} style={field} data-testid="input-search" />
          </label>
          {vendorSelect}
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort orders" className={`${fieldCls} sm:w-40`} style={field} data-testid="select-sort">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="value">Highest value</option>
          </select>
        </div>
        {listError && <div className="p-3 pb-0"><Banner tone="critical" role="alert" testId="text-list-error">{listError} <button onClick={() => void loadList()} className="font-semibold underline ml-1">Retry</button></Banner></div>}
        {!ready ? <div className="p-3 space-y-2" aria-label="Loading orders">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>
          : filtered.length === 0 ? <EmptyState icon={Package} title={query ? "No orders match your search" : statusFilter === "all" ? "No orders here yet" : "No orders here"}
            body={query ? "Try a different reference, vendor, name or product." : "Orders you submit to a vendor appear here. This list refreshes every 30 seconds."} />
          : <OrdersTable orders={filtered} onOpen={setSelectedId} />}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs" style={{ borderTop: "1px solid var(--t-border)", ...subtle }}>
          <span>Showing {filtered.length} of {total.toLocaleString()} order{total === 1 ? "" : "s"}{pageCount > 1 ? ` · tabs and search cover page ${page} of ${pageCount}` : ""}</span>
          {pageCount > 1 && <span className="ml-auto inline-flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)" }}>
            <button className="h-[30px] px-2 disabled:opacity-40 hover:bg-[var(--t-surface2)]" aria-label="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || listLoading}><ChevronLeft className="w-4 h-4" /></button>
            <button className="h-[30px] px-2 disabled:opacity-40 hover:bg-[var(--t-surface2)]" aria-label="Next page" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount || listLoading} style={{ borderLeft: "1px solid var(--t-border)" }}><ChevronRight className="w-4 h-4" /></button>
          </span>}
        </div>
      </Card>
    </div>
  );

  return <Shell view={view} stage={statusFilter} counts={counts} onNav={onNav} vendors={vendors} vendorId={vendorId} onVendor={changeVendor} onViewAs={setPreviewVendor} onLogout={signOut} logoutBusy={authBusy} query={query} onQuery={onGlobalQuery}>
    {body}
    {dialog === "recall" && visibleDetail && <Modal labelId="recall-title" onClose={() => setDialog(null)}>
      <span className="w-9 h-9 rounded-lg grid place-items-center mb-3" style={{ background: TONES.critical.bg, color: TONES.critical.fg }}><AlertTriangle className="w-4 h-4" /></span>
      <h2 id="recall-title" className="text-base font-semibold" style={{ color: "var(--t-text)" }}>Recall order #{visibleDetail.reference}?</h2>
      <p className="text-[13px] mt-1 mb-3" style={muted}>This removes the shipment from the vendor’s fulfilment list and payment list only. It does not cancel or change the customer’s order.</p>
      <div className="space-y-3">
        {actionError && <Banner tone="critical" role="alert">{actionError}</Banner>}
        {needsOverride(visibleDetail) && <Banner tone="warning"><strong>Shipment already started.</strong> {[visibleDetail.trackingNumber ? "Tracking is present" : "", visibleDetail.images.length ? `${visibleDetail.images.length} shipment photo${visibleDetail.images.length === 1 ? "" : "s"} attached` : "", /process/i.test(visibleDetail.status) ? "Processing has started" : ""].filter(Boolean).join(" · ")}. Override and a reason are required.</Banner>}
        <Field label="Reason for recall"><textarea className={`${fieldCls} pa-textarea !h-auto py-2`} style={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="Add the reason for the audit trail" rows={3} /></Field>
        {needsOverride(visibleDetail) && <label className="flex items-start gap-2 text-xs" style={muted}><input type="checkbox" className="w-4 h-4 mt-0.5 accent-[#1A1A1A]" checked={override} onChange={e => setOverride(e.target.checked)} /> I understand this recall does not cancel the customer order</label>}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Btn onClick={() => setDialog(null)}>Keep order</Btn>
        <Btn variant="critical" data-testid="button-recall-confirm" onClick={() => void recall()} disabled={mutationBusy || (needsOverride(visibleDetail) && (!reason.trim() || !override))}>{mutationBusy ? "Recalling…" : "Recall shipment"}</Btn>
      </div>
    </Modal>}
    {dialog === "resubmit" && <Modal wide labelId="resubmit-title" onClose={() => { if (!previewLoading) setDialog(null); }} closeDisabled={previewLoading}>
      <span className="w-9 h-9 rounded-lg grid place-items-center mb-3" style={{ background: TONES.info.bg, color: TONES.info.fg }}><PackageCheck className="w-4 h-4" /></span>
      <h2 id="resubmit-title" className="text-base font-semibold" style={{ color: "var(--t-text)" }}>{preview ? "Review before submitting" : "Submit orders to a vendor"}</h2>
      {!preview ? <>
        <p className="text-[13px] mt-1 mb-3" style={muted}>Enter the source order numbers exactly as provided. You will see the vendor shipment before anything is sent.</p>
        {previewError && <div className="mb-3"><Banner tone="critical" role="alert">{previewError}</Banner></div>}
        <form onSubmit={requestPreview} className="space-y-3">
          <Field label="Vendor"><select className={`${fieldCls} h-9`} style={field} value={vendorId} onChange={e => { setVendorId(e.target.value); setPreview(null); }} disabled={previewLoading} required><option value="">Choose a vendor…</option>{vendors.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}</select></Field>
          <Field label="Source order numbers" hint="One or more numbers, separated by spaces or commas."><textarea className={`${fieldCls} pa-textarea !h-auto py-2 font-mono`} style={field} value={orderCodes} onChange={e => { setOrderCodes(e.target.value); setPreview(null); }} disabled={previewLoading} rows={3} required /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setDialog(null)} disabled={previewLoading}>Cancel</Btn>
            <Btn type="submit" variant="primary" data-testid="button-review-submission" disabled={previewLoading}>{previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Review shipments</Btn>
          </div>
        </form></> : <>
        <p className="text-[13px] mt-1 mb-3" style={muted}>This is what the vendor will receive. Nothing is sent until you confirm below.</p>
        {previewError && <div className="mb-3"><Banner tone="critical" role="alert">{previewError}</Banner></div>}
        <div className="space-y-3 max-h-[52vh] overflow-auto">{preview.shipments.map((shipment, i) => <article key={`${shipment.id}-${i}`} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }} data-testid={`preview-shipment-${shipment.id}`}>
          <header className="flex items-start justify-between gap-3 px-3 py-2.5" style={{ background: "var(--t-surface2)" }}>
            <div className="min-w-0"><strong className="block text-[13px]" style={{ color: "var(--t-text)" }}>#{shipment.reference}</strong><span className="text-xs" style={muted}>{shipment.vendorName}</span></div>
            <b className="text-[13px] tabular-nums" style={{ color: "var(--t-text)" }}>{money(shipment.totalCost)}</b>
          </header>
          <address className="not-italic text-xs px-3 py-2.5 flex flex-col gap-0.5" style={{ ...muted, borderTop: "1px solid var(--t-border)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={subtle}>Ship to</span>
            <strong style={{ color: "var(--t-text)" }}>{shipment.shipping.name || "Recipient not provided"}</strong><span>{shipment.shipping.address || "Address not provided"}</span><span>{shipment.shipping.country}</span>{shipment.shipping.phone && <span>{shipment.shipping.phone}</span>}{shipment.shipping.email && <span>{shipment.shipping.email}</span>}
          </address>
          <table className="w-full text-xs" style={{ borderTop: "1px solid var(--t-border)" }}>
            <thead><tr style={subtle}><th className="text-left font-medium p-2 pl-3">Product</th><th className="text-right font-medium p-2">Qty</th><th className="text-right font-medium p-2">Unit cost</th><th className="text-right font-medium p-2 pr-3">Line total</th></tr></thead>
            <tbody>{shipment.items.map((item, itemIndex) => <tr key={`${item.productName}-${itemIndex}`} style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-text)" }}><td className="p-2 pl-3">{item.productName}</td><td className="p-2 text-right tabular-nums">{item.quantity}</td><td className="p-2 text-right tabular-nums">{money(item.unitCost)}</td><td className="p-2 pr-3 text-right tabular-nums">{money(item.lineTotal)}</td></tr>)}</tbody>
          </table>
          <dl className="text-xs px-3 py-2.5 space-y-1" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-surface2)" }}>
            <div className="flex justify-between"><dt style={muted}>Product total</dt><dd className="tabular-nums">{money(shipment.productCost)}</dd></div>
            <div className="flex justify-between"><dt style={muted}>Shipping</dt><dd className="tabular-nums">{money(shipment.shippingCost)}</dd></div>
            <div className="flex justify-between font-semibold" style={{ color: "var(--t-text)" }}><dt>Supplier total</dt><dd className="tabular-nums">{money(shipment.totalCost)}</dd></div>
          </dl>
        </article>)}</div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn data-testid="button-edit-submission" onClick={() => setPreview(null)} disabled={mutationBusy}>Back to edit</Btn>
          <Btn variant="primary" data-testid="button-confirm-submission" onClick={() => void submitPreview()} disabled={mutationBusy || preview.shipments.length === 0}>{mutationBusy ? "Submitting…" : "Confirm vendor submission"}</Btn>
        </div>
      </>}
    </Modal>}
  </Shell>;
}

/* ---------------------------------------------------------------------------
 * View as vendor: the vendor's own portal screens, read-only, fed from admin data.
 * No vendor session is created and nothing is sent on the vendor's behalf.
 * ------------------------------------------------------------------------- */
function VendorPreview({ vendor, onExit }: { vendor: Vendor; onExit: () => void }) {
  const [orders, setOrders] = useState<VendorOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [money, setMoney] = useState<{ wallets: VendorPreviewWallet[]; payments: VendorPreviewPayment[] } | null>(null);
  const run = useRef(0);
  const load = useCallback(async () => {
    const current = ++run.current;
    setLoading(true); setError(null);
    try {
      // The vendor sees every one of their orders, so walk all pages (the server allows 100 per page).
      const all: VendorOrder[] = [];
      for (let page = 1; page <= 20; page++) {
        const result = await pepsAdminJson<ListResult>(`/admin/vendor-portal/orders?${new URLSearchParams({ vendorId: vendor.id, page: String(page), limit: "100" })}`);
        if (current !== run.current) return;
        all.push(...result.orders);
        setOrders([...all]);
        if (all.length >= result.total || result.orders.length === 0) break;
      }
    } catch (e) { if (current === run.current) setError(errorMessage(e)); }
    finally { if (current === run.current) setLoading(false); }
  }, [vendor.id]);
  useEffect(() => {
    void load();
    let live = true;
    reportRequest(`/api/admin/vendor-payments?vendorId=${encodeURIComponent(vendor.id)}`)
      .then(ledger => { if (live) setMoney({ wallets: Array.isArray(ledger?.wallets) ? ledger.wallets : [], payments: Array.isArray(ledger?.payments) ? ledger.payments : [] }); })
      .catch(() => { if (live) setMoney({ wallets: [], payments: [] }); });
    return () => { live = false; run.current++; };
  }, [load, vendor.id]);
  const loadOrder = useCallback((id: string) => pepsAdminJson<VendorOrder>(orderUrl(id)), []);
  return <VendorPortalPreview vendor={vendor} orders={orders} loading={loading} error={error} onRetry={() => void load()} loadOrder={loadOrder}
    wallets={money?.wallets ?? null} payments={money?.payments ?? null} onExit={onExit} />;
}

/* ---------------------------------------------------------------------------
 * Sign-in frame and dialogs
 * ------------------------------------------------------------------------- */
function Gate({ children }: { children: ReactNode }) {
  return <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 text-[13px]" style={{ background: "var(--t-bg)", color: "var(--t-text)" }}>
    <div className="flex items-center gap-2 mb-5" aria-label="Peps Anonymous">
      <span className="w-9 h-9 rounded-lg grid place-items-center font-bold" style={{ background: "#E9A020", color: "#1A1A1A" }}>P</span>
      <span className="font-semibold text-[15px]">Peps Anonymous <span style={subtle}>· Admin</span></span>
    </div>
    <div className="w-full max-w-[420px]">{children}</div>
  </main>;
}

function Modal({ children, onClose, closeDisabled, wide, labelId }: { children: ReactNode; onClose: () => void; closeDisabled?: boolean; wide?: boolean; labelId: string }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} role="presentation">
    <section className="pa-modal relative w-full max-h-[90dvh] overflow-auto p-5" style={{ ...cardStyle, maxWidth: wide ? 640 : 480, boxShadow: "0 24px 64px rgba(0,0,0,0.28)" }} role="dialog" aria-modal="true" aria-labelledby={labelId}>
      <button onClick={onClose} disabled={closeDisabled} aria-label="Close" className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-[var(--t-surface2)] disabled:opacity-40" style={muted}><X className="w-4 h-4" /></button>
      {children}
    </section>
  </div>;
}

/* ---------------------------------------------------------------------------
 * Shell: top bar + sidebar (same frame as the vendor portal)
 * ------------------------------------------------------------------------- */
type Counts = Record<StageKey | "all", number> & { overdue: number };
function Shell({ children, view, stage, counts, onNav, vendors, vendorId, onVendor, onViewAs, onLogout, logoutBusy, query, onQuery }: {
  children: ReactNode; view: View; stage: StageKey | "all"; counts: Counts; onNav: (v: View, s?: StageKey | "all") => void;
  vendors: Vendor[]; vendorId: string; onVendor: (id: string) => void; onViewAs: (vendor: Vendor) => void;
  onLogout: () => void; logoutBusy: boolean; query: string; onQuery: (q: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [view, stage, vendorId]);
  const item = (active: boolean): CSSProperties => active
    ? { background: "var(--t-surface)", color: "var(--t-text)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)", fontWeight: 600 }
    : { color: "var(--t-muted)", fontWeight: 500 };
  const cls = "w-full flex items-center gap-2.5 h-8 px-2 rounded-lg text-[13px] text-left hover:bg-[color-mix(in_srgb,var(--t-text)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]";
  const sidebar = (
    <nav className="flex flex-col flex-1 h-full p-3 gap-0.5" aria-label="Admin panel">
      <button onClick={() => onNav("home")} className={cls} style={item(view === "home")} aria-current={view === "home" ? "page" : undefined} data-testid="nav-home"><Home className="w-4 h-4" />Home</button>
      <button onClick={() => onNav("orders", "all")} className={cls} style={item(view === "orders")} aria-current={view === "orders" ? "page" : undefined} data-testid="nav-orders">
        <ClipboardList className="w-4 h-4" />Orders
        {counts.new > 0 && <span className="ml-auto tabular-nums text-[11px] font-semibold px-1.5 rounded-md" style={{ background: TONES.attention.bg, color: TONES.attention.fg }}>{counts.new}</span>}
      </button>
      {view === "orders" && <div className="ml-4 pl-2.5 my-0.5 flex flex-col gap-0.5" style={{ borderLeft: "1px solid var(--t-border)" }}>
        {STAGES.map(s => <button key={s.key} onClick={() => onNav("orders", s.key)} className={`${cls} h-7`} style={item(stage === s.key)}>
          {s.label}<span className="ml-auto tabular-nums text-xs" style={subtle}>{counts[s.key]}</span></button>)}
      </div>}
      <button onClick={() => onNav("analytics")} className={cls} style={item(view === "analytics")} aria-current={view === "analytics" ? "page" : undefined} data-testid="nav-analytics"><BarChart3 className="w-4 h-4" />Analytics</button>
      <button onClick={() => onNav("payments")} className={cls} style={item(view === "payments")} aria-current={view === "payments" ? "page" : undefined} data-testid="nav-payments"><Landmark className="w-4 h-4" />Payments</button>
      <button onClick={() => onNav("telegram")} className={cls} style={item(view === "telegram")} aria-current={view === "telegram" ? "page" : undefined} data-testid="nav-telegram"><Send className="w-4 h-4" />Telegram log</button>
      {vendors.length > 0 && <div className="mt-4" data-testid="vendor-switcher">
        <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider" style={subtle}>Vendors</p>
        <div className="flex flex-col gap-0.5">
          {[{ id: "", name: "All vendors" }, ...vendors].map(v => <div key={v.id || "all"} className="flex items-center gap-0.5">
            <button onClick={() => onVendor(v.id)} className={`${cls} min-w-0`} style={item(vendorId === v.id)}
              aria-pressed={vendorId === v.id} data-testid={`vendor-filter-${v.id || "all"}`}>
              {v.id ? <span className="w-4 h-4 rounded grid place-items-center text-[10px] font-bold shrink-0" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>{v.name.slice(0, 1).toUpperCase()}</span> : <Store className="w-4 h-4" />}
              <span className="truncate">{v.name}</span>
              {vendorId === v.id && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
            </button>
            {v.id && <button onClick={() => onViewAs(v)} title={`View the portal as ${v.name}`} aria-label={`View the portal as ${v.name}`} data-testid={`view-as-${v.id}`}
              className="h-8 w-8 shrink-0 grid place-items-center rounded-lg hover:bg-[color-mix(in_srgb,var(--t-text)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]" style={muted}><Eye className="w-4 h-4" /></button>}
          </div>)}
          <p className="px-2 mt-1 text-[11px]" style={subtle}>Click a vendor to filter. The eye opens their portal as they see it.</p>
        </div>
      </div>}
      <div className="mt-auto pt-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid var(--t-border)" }}>
        <button onClick={onLogout} disabled={logoutBusy} className={cls} style={item(false)} data-testid="button-signout"><LogOut className="w-4 h-4" />Log out</button>
      </div>
    </nav>
  );
  return (
    <div className="min-h-[100dvh] text-[13px]" style={{ background: "var(--t-bg)", color: "var(--t-text)" }} data-testid="peps-admin-workspace">
      <header className="sticky top-0 z-40 h-14 flex items-center gap-2 md:gap-3 px-3 md:px-4 text-white print:hidden" style={{ background: "#1A1A1A" }}>
        <button onClick={() => setMenu(true)} className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/10" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 min-w-0 md:min-w-[224px] shrink-0">
          <span className="w-8 h-8 rounded-lg grid place-items-center font-bold text-sm shrink-0" style={{ background: "#E9A020", color: "#1A1A1A" }}>P</span>
          <span className="font-semibold whitespace-nowrap hidden sm:block">Peps Anonymous <span style={{ color: "rgba(255,255,255,0.55)" }}>· Admin</span></span>
        </div>
        <label className="hidden md:flex flex-1 max-w-[560px] mx-auto relative">
          <span className="sr-only">Search orders</span>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.6)" }} />
          <input value={query} onChange={e => onQuery(e.target.value)} placeholder="Search orders" aria-label="Search orders"
            className="w-full h-8 rounded-lg pl-9 pr-3 text-[13px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
            style={{ background: "#303030", border: "1px solid #4A4A4A" }} />
        </label>
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 pl-3 pr-1 h-9 rounded-lg min-w-0" style={{ background: "rgba(255,255,255,0.08)" }}>
            <span className="font-semibold truncate max-w-[160px]">Peps staff</span>
            <span className="w-7 h-7 rounded-md grid place-items-center shrink-0" style={{ background: "#B5E5B7", color: "#0C5132" }}><ShieldCheck className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </header>
      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden md:block sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto print:hidden"
          style={{ background: "color-mix(in srgb, var(--t-bg) 94%, var(--t-text))", borderRight: "1px solid var(--t-border)" }}>{sidebar}</aside>
        {menu && <div className="fixed inset-0 z-50 md:hidden print:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl overflow-y-auto flex flex-col" style={{ background: "var(--t-surface)" }}>
            <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: "1px solid var(--t-border)" }}>
              <span className="font-semibold">Menu</span><button onClick={() => setMenu(false)} aria-label="Close menu" className="p-2 -mr-2 rounded-lg hover:bg-[var(--t-surface2)]"><X className="w-5 h-5" /></button>
            </div>
            {sidebar}
          </div>
        </div>}
        <main className="min-w-0 px-4 md:px-8 py-5 md:py-7 pb-24">{children}</main>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--t-text)" }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={subtle}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof Package; title: string; body: string }) {
  return (
    <div className="text-center py-14 px-4" data-testid="state-empty">
      <span className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-3" style={{ background: "var(--t-surface2)" }}><Icon className="w-5 h-5" style={muted} /></span>
      <p className="font-semibold text-[13px]" style={{ color: "var(--t-text)" }}>{title}</p>
      <p className="text-[13px] mt-1 max-w-sm mx-auto" style={muted}>{body}</p>
    </div>
  );
}

function Metric({ label, value, foot, onClick }: { label: string; value: string; foot: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`text-left p-4 ${onClick ? "hover:bg-[var(--t-surface2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]" : ""}`} style={cardStyle}>
      <p className="text-[13px] font-medium" style={muted}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1 tracking-tight" style={{ color: "var(--t-text)" }}>{value}</p>
      <p className="text-xs mt-1 truncate" style={subtle}>{foot}</p>
    </Tag>
  );
}

/* ---------------------------------------------------------------------------
 * Home overview
 * ------------------------------------------------------------------------- */
function HomeView({ orders, ready, counts, attention, vendorName, updated, scopeNote, actions, banners, onNav, onOpen, onSubmit }: {
  orders: Order[]; ready: boolean; counts: Counts; attention: Order[]; vendorName: string; updated: string; scopeNote: string;
  actions: ReactNode; banners: ReactNode; onNav: (v: View, s?: StageKey | "all") => void; onOpen: (id: string) => void; onSubmit: () => void;
}) {
  const m = useMemo(() => {
    const now = Date.now(), d7 = 7 * 86_400_000;
    const open = orders.filter(isOpen);
    return {
      recent: orders.filter(o => now - time(o) <= d7).length,
      prior: orders.filter(o => { const a = now - time(o); return a > d7 && a <= 2 * d7; }).length,
      open: open.length, openUnits: open.reduce((a, o) => a + units(o), 0), value: open.reduce((a, o) => a + (Number(o.totalCost) || 0), 0),
    };
  }, [orders]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" });
  const delta = m.prior ? Math.round(((m.recent - m.prior) / m.prior) * 100) : null;
  const todos = ([
    { n: counts.overdue, text: `overdue · waiting more than ${OVERDUE_HOURS}h without tracking`, tone: "critical", icon: Clock, stage: "all" },
    { n: counts.new, text: "not started by the vendor yet", tone: "attention", icon: Package, stage: "new" },
    { n: counts.process, text: "in progress and waiting for a tracking number", tone: "info", icon: Truck, stage: "process" },
    { n: counts.hold, text: "on hold · changed after submission, resubmit to unlock", tone: "warning", icon: PauseCircle, stage: "hold" },
  ] as { n: number; text: string; tone: Tone; icon: typeof Package; stage: StageKey | "all" }[]).filter(todo => todo.n > 0);
  const rowCls = "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--t-surface2)]";

  return (
    <div className="max-w-[1120px] mx-auto">
      <PageHeader title={`${greet}, Peps Anonymous`} subtitle={`${today} · ${vendorName} · ${updated}`} actions={actions} />
      {banners}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Metric label="Awaiting fulfilment" value={ready ? String(m.open) : "–"} onClick={() => onNav("orders", "all")}
          foot={counts.overdue ? <span style={{ color: TONES.critical.fg }}>{counts.overdue} overdue</span> : "All within 48h"} />
        <Metric label="Submitted · last 7 days" value={ready ? String(m.recent) : "–"}
          foot={delta === null ? `${m.prior} the week before` : <span className="inline-flex items-center gap-0.5" style={{ color: delta >= 0 ? "#0C5132" : "#8E1F0B" }}>
            {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}{Math.abs(delta)}% vs prior week</span>} />
        <Metric label="Fulfilled" value={ready ? String(counts.ship) : "–"} foot="Tracking added" onClick={() => onNav("orders", "ship")} />
        <Metric label="Open order value" value={ready ? money(m.value) : "–"} foot={`${m.openUnits} units with vendors`} />
      </div>
      {scopeNote && <p className="text-xs mb-4" style={subtle}>{scopeNote}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <Card title="Needs attention" actions={<Btn variant="plain" onClick={() => onNav("orders", "all")}>View all orders<ChevronRight className="w-4 h-4" /></Btn>} flush>
          {!ready ? <div className="p-3 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>
            : attention.length === 0 ? <EmptyState icon={CheckCircle2} title="You're all caught up" body="Every submitted shipment has tracking. New submissions appear here automatically." />
            : <>
              <ul>{attention.map(o => <CompactRow key={o.id} order={o} onOpen={() => onOpen(o.id)} />)}</ul>
              {attention.length < counts.new + counts.process && <div className="px-4 py-2.5 text-xs" style={{ borderTop: "1px solid var(--t-border)", ...subtle }}>Showing the {attention.length} oldest of {counts.new + counts.process} open orders</div>}
            </>}
        </Card>

        <div className="space-y-4">
          <Card title="Things to do today">
            {!ready ? <div className="h-16 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />
              : todos.length === 0 ? <p className="text-[13px]" style={muted}>Nothing outstanding. Enjoy the quiet.</p>
              : <ul className="-mx-2">{todos.map(todo => {
                const Icon = todo.icon;
                return <li key={todo.text}>
                  <button onClick={() => onNav("orders", todo.stage)} className={rowCls}>
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: TONES[todo.tone].bg, color: TONES[todo.tone].fg }}><Icon className="w-4 h-4" /></span>
                    <span className="text-[13px] min-w-0" style={{ color: "var(--t-text)" }}><strong className="tabular-nums">{todo.n}</strong> order{todo.n === 1 ? "" : "s"} {todo.text}</span>
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0" style={subtle} />
                  </button>
                </li>;
              })}</ul>}
          </Card>
          <Card title="Wholesale shortcuts">
            <ul className="-mx-2">
              <li><button onClick={onSubmit} className={rowCls} data-testid="shortcut-submit">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: TONES.info.bg, color: TONES.info.fg }}><PackageCheck className="w-4 h-4" /></span>
                <span className="text-[13px]" style={{ color: "var(--t-text)" }}>Submit orders to a vendor</span><ChevronRight className="w-4 h-4 ml-auto shrink-0" style={subtle} /></button></li>
              <li><button onClick={() => onNav("payments")} className={rowCls} data-testid="shortcut-payments">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: TONES.success.bg, color: TONES.success.fg }}><Landmark className="w-4 h-4" /></span>
                <span className="text-[13px]" style={{ color: "var(--t-text)" }}>Pay a vendor and record the receipt</span><ChevronRight className="w-4 h-4 ml-auto shrink-0" style={subtle} /></button></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Analytics
 * ------------------------------------------------------------------------- */
function AnalyticsView({ vendors, vendorId, onVendor, orders, total, ready, actions, banners, onOpenOrders }: {
  vendors: Vendor[]; vendorId: string; onVendor: (id: string) => void; orders: Order[]; total: number; ready: boolean;
  actions: ReactNode; banners: ReactNode; onOpenOrders: () => void;
}) {
  const [tab, setTab] = useState<"profit" | "comparison">("profit");
  const rows = useMemo(() => {
    const byVendor = new Map<string, { id: string; name: string; orders: number; open: number; overdue: number; fulfilled: number; hold: number; value: number; openValue: number }>();
    for (const o of orders) {
      const row = byVendor.get(o.vendorId) ?? { id: o.vendorId, name: o.vendorName, orders: 0, open: 0, overdue: 0, fulfilled: 0, hold: 0, value: 0, openValue: 0 };
      const k = stageKey(o), cost = Number(o.totalCost) || 0;
      row.orders++; row.value += cost;
      if (isOpen(o)) { row.open++; row.openValue += cost; }
      if (overdue(o)) row.overdue++;
      if (k === "ship" || k === "terminal") row.fulfilled++;
      if (k === "hold") row.hold++;
      byVendor.set(o.vendorId, row);
    }
    return [...byVendor.values()].sort((a, b) => b.orders - a.orders);
  }, [orders]);
  const vendorName = vendorId ? vendors.find(v => v.id === vendorId)?.name ?? "Selected vendor" : "All vendors";
  const num = "p-2.5 text-right tabular-nums";
  return (
    <div className="max-w-[1320px] mx-auto">
      <PageHeader title="Analytics" subtitle={`${vendorName} · fulfilment by vendor, revenue and profit, and period comparisons`} actions={actions} />
      {banners}
      <Card flush title="Fulfilment by vendor" className="mb-4" testId="analytics-vendors"
        actions={<Btn variant="plain" onClick={onOpenOrders}>View orders<ChevronRight className="w-4 h-4" /></Btn>}
        footer={<span className="text-xs mr-auto" style={muted}>{total > orders.length ? `Based on the ${orders.length} most recent of ${total.toLocaleString()} orders.` : `Based on all ${orders.length} orders.`} Click a vendor to filter the whole panel.</span>}>
        {!ready ? <div className="p-3"><div className="h-16 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} /></div>
          : rows.length === 0 ? <EmptyState icon={BarChart3} title="No orders to analyse yet" body="Submit orders to a vendor and their fulfilment numbers appear here." />
          : <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[640px]">
            <thead><tr className="text-xs" style={{ ...subtle, borderBottom: "1px solid var(--t-border)" }}>
              <th className="text-left font-medium p-2.5 pl-4">Vendor</th><th className="text-right font-medium p-2.5">Orders</th><th className="text-right font-medium p-2.5">Open</th>
              <th className="text-right font-medium p-2.5">Overdue</th><th className="text-right font-medium p-2.5">On hold</th><th className="text-right font-medium p-2.5">Fulfilled</th>
              <th className="text-right font-medium p-2.5">Open value</th><th className="text-right font-medium p-2.5 pr-4">Total cost</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="hover:bg-[var(--t-surface2)]" style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                <td className="p-2.5 pl-4"><button onClick={() => onVendor(vendorId === r.id ? "" : r.id)} className="font-semibold text-left hover:underline" style={{ color: "var(--t-blue)" }} data-testid={`analytics-vendor-${r.id}`}>{r.name}</button></td>
                <td className={num}>{r.orders}</td><td className={num}>{r.open}</td>
                <td className={num} style={r.overdue ? { color: TONES.critical.fg, fontWeight: 600 } : undefined}>{r.overdue}</td>
                <td className={num}>{r.hold}</td>
                <td className={num}>{r.fulfilled} <span style={subtle}>({Math.round((r.fulfilled / r.orders) * 100)}%)</span></td>
                <td className={num}>{money(r.openValue)}</td><td className={`${num} pr-4 font-medium`}>{money(r.value)}</td>
              </tr>))}</tbody>
          </table></div>}
      </Card>
      <div role="tablist" className="inline-flex gap-1 p-1 rounded-lg mb-4" style={{ background: "var(--t-surface2)" }}>
        {([["profit", "Revenue & profit"], ["comparison", "Orders comparison"]] as const).map(([key, label]) =>
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} data-testid={`analytics-tab-${key}`} className="h-8 px-3 rounded-md text-[13px] font-semibold"
            style={tab === key ? { background: "var(--t-surface)", color: "var(--t-text)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)" } : { color: "var(--t-muted)" }}>{label}</button>)}
      </div>
      <section className="pap-root">
        {tab === "profit" ? <RevenueProfitReport vendors={vendors} request={reportRequest} vendorId={vendorId} />
          : <OrderComparison vendors={vendors} request={reportRequest} vendorId={vendorId} />}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Telegram log: what the vendor bot sent, to whom, and whether it arrived
 * ------------------------------------------------------------------------- */
type TelegramEntry = { id: string; vendorId: string | null; vendorName: string | null; chatTitle: string | null; kind: string | null; text: string; buttonUrl: string | null; ok: boolean; error: string | null; createdAt: string };
const TELEGRAM_KINDS: Record<string, string> = {
  new_order: "New order", hold: "On hold", overdue: "Overdue reminder", overdue_critical: "Urgent overdue", issue_resolved: "Problem resolved",
  message: "Message", test: "Test",
};
/** Telegram messages are stored as bot HTML; show them as plain text rather than injecting markup. */
function telegramText(html: string) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}
function TelegramLogView({ vendors, vendorId, vendorSelect, banners }: { vendors: Vendor[]; vendorId: string; vendorSelect: ReactNode; banners: ReactNode }) {
  const [entries, setEntries] = useState<TelegramEntry[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = useRef(0);
  const load = useCallback(async (before?: string) => {
    const current = ++run.current;
    setLoading(true); setError("");
    const params = new URLSearchParams({ limit: "50" });
    if (vendorId) params.set("vendorId", vendorId);
    if (failedOnly) params.set("failed", "1");
    if (before) params.set("before", before);
    try {
      const result = await pepsAdminJson<{ entries: TelegramEntry[]; hasMore: boolean }>(`/admin/vendor-telegram/log?${params}`);
      if (current !== run.current) return;
      setEntries(previous => before && previous ? [...previous, ...result.entries] : result.entries);
      setHasMore(result.hasMore);
    } catch (e) { if (current === run.current) setError(errorMessage(e)); }
    finally { if (current === run.current) setLoading(false); }
  }, [vendorId, failedOnly]);
  useEffect(() => { setEntries(null); void load(); return () => { run.current++; }; }, [load]);
  const vendorName = vendorId ? vendors.find(v => v.id === vendorId)?.name ?? "Selected vendor" : "All vendors";
  return (
    <div className="max-w-[880px] mx-auto">
      <PageHeader title="Telegram log" subtitle={`${vendorName} · every message the vendor bot sent, newest first`} actions={<>
        {vendorSelect}
        <Btn onClick={() => void load()} disabled={loading} aria-label="Refresh log" data-testid="button-refresh-telegram" className="!px-2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Btn>
      </>} />
      {banners}
      {error && <div className="mb-4"><Banner tone="critical" role="alert">{error} <button onClick={() => void load()} className="font-semibold underline ml-1">Retry</button></Banner></div>}
      <Card flush testId="telegram-log">
        <div className="flex items-center gap-1 px-3 pt-3 pb-2" role="tablist" style={{ borderBottom: "1px solid var(--t-border)" }}>
          {([[false, "All messages"], [true, "Failed only"]] as const).map(([value, label]) =>
            <button key={label} role="tab" aria-selected={failedOnly === value} onClick={() => setFailedOnly(value)} data-testid={`telegram-filter-${value ? "failed" : "all"}`}
              className="h-8 px-3 rounded-lg text-[13px] whitespace-nowrap hover:bg-[var(--t-surface2)]"
              style={{ background: failedOnly === value ? "var(--t-surface2)" : undefined, color: failedOnly === value ? "var(--t-text)" : "var(--t-muted)", fontWeight: failedOnly === value ? 600 : 500 }}>{label}</button>)}
        </div>
        {entries === null ? (error ? null : <div className="p-3 space-y-2" aria-label="Loading log">{[0, 1, 2].map(i => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>)
          : entries.length === 0 ? <EmptyState icon={Send} title={failedOnly ? "No failed messages" : "Nothing logged yet"}
            body={failedOnly ? "Every logged message was accepted by Telegram." : "Messages appear here from the moment logging was switched on. Earlier messages were not recorded."} />
          : <ul>{entries.map(entry => (
            <li key={entry.id} className="px-4 py-3" style={{ borderBottom: "1px solid var(--t-border)" }} data-testid={`telegram-entry-${entry.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={entry.ok ? "success" : "critical"} progress={entry.ok ? "complete" : "incomplete"}>{entry.ok ? "Sent" : "Failed"}</Badge>
                <Badge tone={entry.kind ? "info" : "neutral"}>{entry.kind ? TELEGRAM_KINDS[entry.kind] ?? entry.kind.replace(/_/g, " ") : "Bot reply"}</Badge>
                <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{entry.vendorName ?? "Unlinked chat"}</span>
                {entry.chatTitle && <span className="text-xs" style={subtle}>→ {entry.chatTitle}</span>}
                <span className="text-xs ml-auto tabular-nums" style={subtle} title={date(entry.createdAt)}>{when(entry.createdAt)}</span>
              </div>
              <p className="text-[13px] mt-2 whitespace-pre-wrap break-words rounded-lg p-3" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}>{telegramText(entry.text)}</p>
              {entry.buttonUrl && <p className="text-xs mt-1.5 break-all" style={subtle}>Button link: {entry.buttonUrl}</p>}
              {!entry.ok && <p className="text-xs mt-1.5" style={{ color: TONES.critical.fg }}>Telegram said: {entry.error || "not accepted"}</p>}
            </li>))}</ul>}
        {entries !== null && hasMore && <div className="px-4 py-3 text-center"><Btn onClick={() => void load(entries[entries.length - 1]?.createdAt)} disabled={loading} data-testid="button-telegram-more">{loading ? "Loading…" : "Load older messages"}</Btn></div>}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Index table
 * ------------------------------------------------------------------------- */
const COLS = "md:grid-cols-[minmax(0,1fr)_120px_minmax(0,0.9fr)_minmax(0,1.1fr)_56px_96px_124px_112px]";
const HEADERS = ["Order", "Date", "Vendor", "Ship to", "Items", "Total", "Fulfillment", ""];

function OrdersTable({ orders, onOpen }: { orders: Order[]; onOpen: (id: string) => void }) {
  return <>
    <div className={`hidden md:grid ${COLS} gap-3 px-4 h-9 items-center text-xs font-medium`} style={{ borderBottom: "1px solid var(--t-border)", ...subtle }}>
      {HEADERS.map((h, i) => <span key={i} className={i === 4 || i === 5 ? "text-right" : ""}>{h}</span>)}
    </div>
    <ul>{orders.map(o => {
      const k = stageKey(o);
      return (
        <li key={o.id} className={`relative grid grid-cols-1 ${COLS} gap-x-3 gap-y-1 px-4 py-3 items-center hover:bg-[var(--t-surface2)]`} style={{ borderBottom: "1px solid var(--t-border)", opacity: o.stale ? 0.85 : 1 }}>
          <button onClick={() => onOpen(o.id)} className="text-left min-w-0 after:absolute after:inset-0 focus-visible:outline-none" data-testid={`row-order-${o.id}`}>
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>#{o.reference}</span>
              {overdue(o) && <Badge tone="critical">Overdue</Badge>}
              <span className="md:hidden ml-auto"><StageBadge order={o} /></span>
            </span>
            <span className="block text-xs mt-0.5 md:hidden" style={muted}>{when(o.submittedAt)} · {o.vendorName} · {o.shipping.name}, {o.shipping.country} · {units(o)} items · {money(o.totalCost)}</span>
          </button>
          <span className="hidden md:block text-[13px] truncate" style={{ color: "var(--t-text)" }}>{when(o.submittedAt)}<span className="block text-xs" style={subtle}>{age(o.submittedAt)}</span></span>
          <span className="hidden md:block min-w-0 text-[13px] truncate" style={{ color: "var(--t-text)" }}>{o.vendorName}</span>
          <span className="hidden md:block min-w-0 text-[13px] truncate" style={{ color: "var(--t-text)" }}>{o.shipping.name || "—"}<span className="block text-xs truncate" style={subtle}>{o.shipping.country}</span></span>
          <span className="hidden md:block text-[13px] text-right tabular-nums" style={{ color: "var(--t-text)" }}>{units(o)}</span>
          <span className="hidden md:block text-[13px] text-right tabular-nums font-medium" style={{ color: "var(--t-text)" }}>{money(o.totalCost)}</span>
          <span className="hidden md:block"><StageBadge order={o} /></span>
          <span className="hidden md:flex justify-end items-center gap-2 min-w-0">
            {k === "ship" && o.trackingNumber ? <span className="text-xs font-mono truncate" style={subtle} title={`${o.carrier ?? ""} ${o.trackingNumber}`}>{o.trackingNumber}</span>
              : <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: k === "new" || k === "process" ? "var(--t-blue)" : "var(--t-subtle)" }}>{ctaFor(k)}<ChevronRight className="w-3.5 h-3.5" /></span>}
          </span>
        </li>);
    })}</ul>
  </>;
}

/** Single-line list row used on Home, where the card is too narrow for the full index table. */
function CompactRow({ order: o, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 hover:bg-[var(--t-surface2)]" style={{ borderBottom: "1px solid var(--t-border)" }}>
      <button onClick={onOpen} className="text-left min-w-0 flex-1 after:absolute after:inset-0 focus-visible:outline-none" data-testid={`card-order-${o.id}`}>
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>#{o.reference}</span>
          {overdue(o) && <Badge tone="critical">Overdue</Badge>}
        </span>
        <span className="block text-xs mt-0.5 truncate" style={muted}>{when(o.submittedAt)} · {o.vendorName} · {o.shipping.name}, {o.shipping.country} · {units(o)} item{units(o) === 1 ? "" : "s"} · {money(o.totalCost)}</span>
      </button>
      <StageBadge order={o} />
      <span className="hidden sm:flex text-xs font-semibold items-center gap-0.5 w-24 justify-end whitespace-nowrap" style={{ color: "var(--t-blue)" }}>{ctaFor(stageKey(o))}<ChevronRight className="w-3.5 h-3.5" /></span>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * Order detail
 * ------------------------------------------------------------------------- */
function DetailView({ order, loading, error, onBack, onRetry, trackingNumber, setTrackingNumber, carrier, setCarrier, extraParcels, setExtraParcels, busy, actionError, onDismissError, onProcess, onTracking, onRecall, onPayments, prev, next, onOpen }: {
  order: Order | null; loading: boolean; error: string; onBack: () => void; onRetry: () => void;
  trackingNumber: string; setTrackingNumber: (s: string) => void; carrier: string; setCarrier: (s: string) => void;
  extraParcels: VendorTrackingParcel[]; setExtraParcels: (value: VendorTrackingParcel[]) => void;
  busy: boolean; actionError: string; onDismissError: () => void; onProcess: () => void; onTracking: () => void; onRecall: () => void; onPayments: () => void;
  prev: Order | null; next: Order | null; onOpen: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const backBtn = <Btn onClick={onBack} aria-label="Back to orders" data-testid="button-back" className="!px-2 shrink-0"><ArrowLeft className="w-4 h-4" /></Btn>;
  if (!order) return (
    <div className="max-w-[1120px] mx-auto">
      <div className="mb-4">{backBtn}</div>
      {error ? <Card><EmptyState icon={AlertTriangle} title="Shipment could not be loaded" body={error} /><div className="text-center pb-4"><Btn onClick={onRetry}>Try again</Btn></div></Card>
        : <div className="space-y-3" aria-label="Loading shipment">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>}
    </div>
  );
  const k = stageKey(order);
  const meta = STAGES.find(s => s.key === k);
  const canProcess = !order.stale && !terminalStatus(order) && !/ship/i.test(order.status) && !order.trackingNumber;
  const canTrack = !order.stale && !terminalStatus(order);
  const s = order.shipping;
  const addressLines = vendorAddressLines(s.address, s.country);
  const copyAddress = async () => {
    try { await navigator.clipboard.writeText([s.name, ...addressLines, s.country, s.phone].filter(Boolean).join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* Clipboard unavailable: the address stays selectable. */ }
  };
  const timeline = [
    { label: `Submitted to ${order.vendorName}`, detail: `${order.items.length} line${order.items.length === 1 ? "" : "s"} · ${units(order)} units`, when: when(order.submittedAt) },
    ...order.images.map(img => ({ label: "Packing photo added", detail: img.filename, when: when(img.createdAt) })),
    ...(k === "process" || k === "ship" ? [{ label: "Marked as processing", detail: "", when: "" }] : []),
    ...(k === "ship" ? [{ label: "Tracking added · order fulfilled", detail: [order.carrier, order.trackingNumber].filter(Boolean).join(" "), when: "" }] : []),
    ...(order.stale ? [{ label: "Changed after submission · on hold", detail: "Resubmit the order to unlock it for the vendor", when: "" }] : []),
    ...(k === "terminal" ? [{ label: stageLabel(order), detail: "", when: "" }] : []),
  ];

  return (
    <div className="max-w-[1120px] mx-auto">
      <div className="flex flex-wrap items-start gap-3 mb-4">
        {backBtn}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--t-text)" }} data-testid="text-reference">#{order.reference}</h1>
            <StageBadge order={order} />
            {overdue(order) && <Badge tone="critical">Overdue</Badge>}
          </div>
          <p className="text-xs mt-0.5" style={subtle} title={date(order.submittedAt)}>{order.vendorName} · Submitted {when(order.submittedAt)} · {order.items.length} line{order.items.length === 1 ? "" : "s"} · {units(order)} units</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Btn onClick={onRetry} disabled={loading} aria-label="Refresh shipment" className="!px-2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Btn>
          <Btn onClick={() => downloadVendorOrdersCsv([order])} data-testid="button-export-order-csv"><Download className="w-4 h-4" />Export</Btn>
          <Btn onClick={() => printPackingSlip(order)} data-testid="button-print-slip"><Printer className="w-4 h-4" />Print packing slip</Btn>
          <span className="inline-flex rounded-lg overflow-hidden ml-auto sm:ml-0" style={{ border: "1px solid var(--t-border)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)", background: "var(--t-surface)" }}>
            <button disabled={!prev} onClick={() => prev && onOpen(prev.id)} className="h-[30px] px-2 disabled:opacity-40 hover:bg-[var(--t-surface2)]" aria-label="Previous order" data-testid="button-prev-order"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={!next} onClick={() => next && onOpen(next.id)} className="h-[30px] px-2 disabled:opacity-40 hover:bg-[var(--t-surface2)]" aria-label="Next order" data-testid="button-next-order" style={{ borderLeft: "1px solid var(--t-border)" }}><ChevronRight className="w-4 h-4" /></button>
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4 empty:hidden">
        {order.stale && <Banner tone="warning" testId="text-stale">This shipment changed after it was sent to the vendor. Processing and tracking are locked until it is resubmitted.</Banner>}
        {actionError && <Banner tone="critical" role="alert" testId="text-action-result" onDismiss={onDismissError}>{actionError}</Banner>}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card flush title={<Badge tone={meta?.tone ?? "neutral"} progress={meta?.progress ?? "complete"}>{stageLabel(order)} ({units(order)})</Badge>}
            actions={k === "ship" && order.trackingNumber ? <span className="text-xs font-mono truncate max-w-[180px]" style={subtle}>{order.trackingNumber}</span> : undefined}
            footer={order.stale ? <span className="text-xs mr-auto" style={muted}>Locked while on hold.</span>
              : canProcess ? <>
                <span className="text-xs mr-auto hidden sm:inline" style={muted}>Mark it as processing on the vendor’s behalf.</span>
                <Btn variant="primary" onClick={onProcess} disabled={busy} data-testid="button-process">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}Mark as processing</Btn></>
              : <span className="text-xs mr-auto" style={muted}>{k === "terminal" ? `${stageLabel(order)}. No fulfilment updates are available.` : `Fulfilled${order.carrier ? ` via ${order.carrier}` : ""}.`}</span>}>
            <ul className="px-4 pb-1">
              {order.items.map((it, i) => (
                <li key={`${it.productName}-${i}`} className="flex items-center gap-3 py-3" style={{ borderTop: i ? "1px solid var(--t-border)" : undefined }}>
                  <span className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}><Package className="w-4 h-4" style={subtle} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate" style={{ color: "var(--t-text)" }}>{it.productName}</span>
                    <span className="block text-xs tabular-nums" style={subtle}>{money(it.unitCost)} × {it.quantity}</span>
                  </span>
                  <span className="text-[13px] tabular-nums" style={{ color: "var(--t-text)" }}>{money(it.lineTotal)}</span>
                </li>))}
            </ul>
          </Card>

          <Card title="Shipment">
            {vendorTrackingParcels(order).length > 0 && <div className="flex items-center gap-3 rounded-lg p-3 mb-3" style={{ background: "var(--t-surface2)" }}>
              <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: TONES.success.bg, color: TONES.success.fg }}><Truck className="w-4 h-4" /></span>
              <div className="min-w-0"><TrackingParcelList order={order} /></div>
            </div>}
            {canTrack ? <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Carrier"><input className={fieldCls} style={field} value={carrier} disabled={busy} onChange={e => setCarrier(e.target.value)} maxLength={120} autoComplete="off" data-testid="input-carrier" /></Field>
              <Field label="Tracking number"><input className={`${fieldCls} font-mono`} style={field} value={trackingNumber} disabled={busy} onChange={e => setTrackingNumber(e.target.value)} autoComplete="off" data-testid="input-tracking" /></Field>
              <div className="sm:col-span-2"><ExtraParcels parcels={extraParcels} onChange={setExtraParcels} disabled={busy} /></div>
              <div className="sm:col-span-2 flex justify-end">
                <Btn variant="primary" onClick={onTracking} disabled={busy || !trackingNumber.trim() || !carrier.trim() || extraParcels.some(p => !p.courier.trim() || !p.internationalTrackingNumber.trim())} data-testid="button-save-tracking">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}{k === "ship" ? "Update tracking" : "Save tracking and mark fulfilled"}</Btn>
              </div>
            </div> : <p className="text-[13px]" style={muted}>{order.stale ? "Tracking is locked while this shipment is on hold." : "No tracking updates are available for this order state."}</p>}
          </Card>

          <Card title="Packing photos" actions={<span className="text-xs tabular-nums" style={subtle}>{order.images.length} attached</span>}>
            {order.images.length ? <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{order.images.map((img, i) => (
              <button key={img.id} onClick={() => setLightbox(i)} className="aspect-square rounded-lg overflow-hidden block hover:opacity-90" style={{ border: "1px solid var(--t-border)" }} data-testid={`img-order-${img.id}`} aria-label={`View ${img.filename}`}>
                <img src={img.url} alt={img.filename} className="w-full h-full object-cover" loading="lazy" /></button>))}</div>
              : <p className="text-[13px]" style={muted}>The vendor has not added any packing photos yet.</p>}
          </Card>

          <Card title="Timeline">
            <ol className="relative ml-2">
              {timeline.map((ev, i) => (
                <li key={i} className="relative pl-6 pb-4 last:pb-0">
                  {i < timeline.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px" style={{ background: "var(--t-border)" }} aria-hidden />}
                  <span className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full" style={{ background: "var(--t-surface)", border: "2px solid var(--t-subtle)" }} aria-hidden />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="text-[13px]" style={{ color: "var(--t-text)" }}>{ev.label}</p>
                    {ev.when && <span className="text-xs ml-auto tabular-nums" style={subtle}>{ev.when}</span>}
                  </div>
                  {ev.detail && <p className="text-xs mt-0.5 break-all" style={muted}>{ev.detail}</p>}
                </li>))}
            </ol>
          </Card>

          <Card title="Recall from vendor" footer={<Btn variant="critical" onClick={onRecall} data-testid="button-recall"><Undo2 className="w-4 h-4" />Recall order</Btn>}>
            <p className="text-[13px]" style={muted}>Removes this shipment from the vendor’s fulfilment and payment lists. The customer’s order is not cancelled or changed.</p>
          </Card>
        </div>

        <aside className="space-y-4 min-w-0">
          <Card title="Vendor">
            <p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{order.vendorName}</p>
            <p className="text-xs mt-0.5" style={subtle}>Vendor reference · #{order.reference}</p>
          </Card>
          <Card title="Customer">
            <p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{s.name || "Recipient not provided"}</p>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <h3 className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>Contact information</h3>
              <p className="text-[13px] break-all" style={s.email ? { color: "var(--t-blue)" } : subtle}>{s.email || "No email provided"}</p>
              <p className="text-[13px]" style={s.phone ? muted : subtle}>{s.phone || "No phone number"}</p>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>Shipping address</h3>
                <Btn variant="plain" onClick={() => void copyAddress()} data-testid="button-copy-address">{copied ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}</Btn>
              </div>
              <address className="not-italic text-[13px] whitespace-pre-line" style={muted}>{[s.name, ...(addressLines.length ? addressLines : ["Address not provided"]), s.country].filter(Boolean).join("\n")}</address>
            </div>
          </Card>
          <Card title="Cost summary" footer={<Btn onClick={onPayments} data-testid="button-open-payments"><Landmark className="w-4 h-4" />Open payments</Btn>}>
            <dl className="text-[13px] space-y-2">
              <div className="flex justify-between gap-3"><dt style={muted}>Subtotal <span style={subtle}>· {units(order)} item{units(order) === 1 ? "" : "s"}</span></dt><dd className="tabular-nums" style={{ color: "var(--t-text)" }}>{money(order.productCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt style={muted}>Shipping</dt><dd className="tabular-nums" style={{ color: "var(--t-text)" }}>{money(order.shippingCost)}</dd></div>
              <div className="flex justify-between gap-3 pt-2 font-semibold" style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-text)" }}><dt>Total cost</dt><dd className="tabular-nums" data-testid={`text-total-${order.id}`}>{money(order.totalCost)}</dd></div>
            </dl>
            <p className="text-xs mt-3" style={subtle}>Wholesale cost payable to {order.vendorName}. Customer pricing is not shown.</p>
          </Card>
        </aside>
      </div>

      {lightbox !== null && order.images[lightbox] && (
        <div role="dialog" aria-modal="true" aria-label="Photo preview" className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(5,12,28,0.85)" }} onClick={() => setLightbox(null)}>
          <img src={order.images[lightbox].url} alt={order.images[lightbox].filename} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Close"><X className="w-5 h-5" /></button>
          {order.images.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + order.images.length) % order.images.length); }} className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Previous photo"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % order.images.length); }} className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Next photo"><ChevronRight className="w-5 h-5" /></button>
          </>}
          <p className="absolute bottom-4 text-xs text-white/70">{lightbox + 1} / {order.images.length} · {order.images[lightbox].filename}</p>
        </div>)}
    </div>
  );
}
