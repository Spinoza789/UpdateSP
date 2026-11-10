import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, Image as ImageIcon, LoaderCircle, LogOut, Package, PackageCheck,
  RefreshCw, Search, ShieldCheck, Truck, X,
} from "lucide-react";
import { AdminApiError, AdminSessionExpiredError, retryAdminAvailability } from "@/lib/admin-auth";
import { pepsAdminAuth, pepsAdminJson } from "@/lib/peps-admin";
import { Badge, Btn, Card } from "@/components/vendor-ui";
import "./peps-admin.css";

type Item = { productName: string; quantity: number; unitCost: string; lineTotal: string };
type Image = { id: string; filename: string; url: string; createdAt: string };
type Order = {
  id: string; reference: string; status: string; submittedAt: string; stale: boolean;
  vendorId: string; vendorName: string; items: Item[]; currency: "USD";
  productCost: string; shippingCost: string; totalCost: string;
  shipping: { name: string; address: string; country: string; phone: string; email: string };
  trackingNumber: string | null; carrier: string | null; images: Image[];
};
type Vendor = { id: string; name: string };
type ListResult = { vendors: Vendor[]; orders: Order[]; total: number; page: number; limit: number };
type AuthView = "boot" | "retry" | "login" | "workspace";
const LIMIT = 50;
const money = (v: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
const date = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };
const terminalStatus = (o: Order) => /complete|refund|cancel/i.test(o.status);
const stageLabel = (o: Order) => o.stale ? "On hold" : terminalStatus(o) ? (/refund/i.test(o.status) ? "Refunded" : /cancel/i.test(o.status) ? "Cancelled" : "Completed") : o.trackingNumber || /ship/i.test(o.status) ? "Shipped" : /process/i.test(o.status) ? "Processing" : o.status.replaceAll("_", " ");
const stageKey = (o: Order) => o.stale ? "hold" : terminalStatus(o) ? "terminal" : o.trackingNumber || /ship/i.test(o.status) ? "ship" : /process/i.test(o.status) ? "process" : "new";
const toneFor = (o: Order): "attention" | "info" | "success" | "warning" | "neutral" => o.stale ? "warning" : terminalStatus(o) ? "neutral" : o.trackingNumber || /ship/i.test(o.status) ? "success" : /process/i.test(o.status) ? "info" : "attention";
const orderUrl = (id: string) => `/admin/vendor-portal/orders/${encodeURIComponent(id)}`;
const needsOverride = (o: Order) => !!o.trackingNumber || o.images.length > 0 || /process|ship/i.test(o.status);
function errorMessage(e: unknown) { return e instanceof Error ? e.message : "Something went wrong. Please try again."; }

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
  const [statusFilter, setStatusFilter] = useState("all");
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
  }, [detail?.id, selectedId]);

  const filtered = useMemo(() => orders.filter(o => {
    const matchesStatus = statusFilter === "all" || stageKey(o) === statusFilter;
    const q = query.trim().toLowerCase();
    return matchesStatus && (!q || [o.reference, o.vendorName, o.shipping.name, o.shipping.country, o.trackingNumber ?? "", ...o.items.map(i => i.productName)].some(x => x.toLowerCase().includes(q)));
  }), [orders, query, statusFilter]);
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
  const saveTracking = () => detail && !detail.stale && trackingNumber.trim() && carrier.trim() && void mutate(detail.id, { action: "tracking", trackingNumber: trackingNumber.trim(), carrier: carrier.trim() });
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

  if (authView === "boot" || authView === "retry") return <main className="pa-root pa-gate">
    <BrandMark />
    {authView === "boot" ? <section className="pa-gate-card" aria-label="Checking admin session"><div className="pa-skeleton wide" /><div className="pa-skeleton" /><div className="pa-skeleton" /></section> :
      <section className="pa-gate-card" role="alert"><CircleAlert size={23} /><h1>Admin workspace unavailable</h1><p>{authError || "We couldn’t check your session right now."} Your sign-in has not been cleared.</p><button className="pa-button pa-primary" onClick={() => setRetryTick(n => n + 1)}>Try again</button></section>}
  </main>;
  if (authView === "login") return <main className="pa-root pa-gate"><BrandMark />
    <form className="pa-gate-card" onSubmit={signIn}>
      <div className="pa-kicker"><ShieldCheck size={15} /> PEPS STAFF ACCESS</div>
      <h1>{challenge ? "Verify it’s you" : "Welcome back"}</h1>
      <p>{challenge ? (recovery ? "Enter one unused recovery code." : "Enter the verification code from your authenticator.") : "Manage supplier fulfilment from one secure workspace."}</p>
      {authError && <div className="pa-error" role="alert">{authError}</div>}
      {twoFactor && !challenge && <label className="pa-label">Username<input className="pa-input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label>}
      {challenge ? <label className="pa-label">{recovery ? "Recovery code" : "Authentication code"}<input className="pa-input pa-code" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} required autoFocus /></label> :
        <label className="pa-label">{twoFactor ? "Password" : "Admin password"}<input className="pa-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>}
      <label className="pa-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Keep me signed in</label>
      <button className="pa-button pa-primary pa-full" disabled={authBusy}>{authBusy ? <LoaderCircle className="pa-spin" size={17} /> : null}{challenge ? "Verify and continue" : "Sign in"}</button>
      {challenge && <button type="button" className="pa-text-button" onClick={() => { setRecovery(v => !v); setCode(""); }}>{recovery ? "Use authenticator code" : "Use a recovery code"}</button>}
    </form>
  </main>;

  return <main className="pa-root" data-testid="peps-admin-workspace">
    <header className="pa-topbar">
      <div className="pa-brand"><BrandMark compact /><span className="pa-divider" /><span className="pa-workspace-label">Fulfilment desk</span></div>
      <div className="pa-top-right"><span className="pa-secure"><span /> Admin session active</span><button className="pa-icon-button" onClick={signOut} disabled={authBusy} aria-label="Sign out" data-testid="button-signout"><LogOut size={16} /><span>Sign out</span></button></div>
    </header>
    <div className="pa-content">
      {!selectedId ? <>
        <div className="pa-heading-row">
          <div><div className="pa-kicker">SUPPLIER OPERATIONS <span> / </span> ORDERS</div><h1>Shipment overview</h1><p>Every vendor shipment, in one place. No supplier login required.</p></div>
          <div className="pa-heading-actions"><div className="pa-updated">{updatedAt ? <>Updated {updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</> : "Waiting for orders"}</div><button className="pa-button pa-outline" onClick={() => void loadList()} disabled={listLoading} data-testid="button-refresh"><RefreshCw size={15} className={listLoading ? "pa-spin" : ""} />Refresh</button><button className="pa-button pa-primary" onClick={() => { setDialog("resubmit"); setPreview(null); setPreviewError(""); }} data-testid="button-resubmit"><PackageCheck size={15} />Submit orders</button></div>
        </div>
        {actionError && <div className="pa-error pa-inline" role="alert">{actionError}<button onClick={() => setActionError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
        <section className="pa-summary">
          <div className="pa-summary-intro"><span className="pa-summary-mark"><Package size={18} /></span><div><strong>Fulfilment at a glance</strong><span>{vendorId ? vendors.find(v => v.id === vendorId)?.name ?? "Selected supplier" : "All supplier accounts"}</span></div></div>
          <div className="pa-stat"><span>ORDERS IN THIS VIEW</span><strong>{total.toLocaleString()}</strong></div>
          <div className="pa-stat"><span>PAGE</span><strong>{page} <i>of</i> {pageCount}</strong></div>
          <div className="pa-summary-note"><span className="pa-live-dot" />Latest shipment state from vendor portal</div>
        </section>
        <Card flush className="pa-list-card">
          <div className="pa-toolbar">
            <label className="pa-search"><Search size={16} /><input aria-label="Search orders" placeholder="Search reference, vendor, recipient, product…" value={query} onChange={e => setQuery(e.target.value)} data-testid="input-search" /><kbd>⌘ K</kbd></label>
            <div className="pa-filters">
              <label className="pa-select-wrap"><span className="sr-only">Filter by vendor</span><select value={vendorId} onChange={e => { setVendorId(e.target.value); setPage(1); setOrders([]); setTotal(0); setSelectedId(null); setDetail(null); detailGen.current++; }} data-testid="select-vendor"><option value="">All vendors</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><ChevronDown size={14} /></label>
              <label className="pa-select-wrap"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="select-status"><option value="all">All statuses</option><option value="new">Unfulfilled</option><option value="process">Processing</option><option value="ship">Shipped</option><option value="hold">On hold</option></select><ChevronDown size={14} /></label>
            </div>
          </div>
          <div className="pa-table-label"><span>ORDER QUEUE</span><span>{filtered.length} shown on this page</span></div>
          {listError && <div className="pa-error pa-inline" role="alert">{listError}<button onClick={() => void loadList()} className="pa-retry-link">Retry</button></div>}
          {listLoading && orders.length === 0 ? <div className="pa-loading" aria-label="Loading orders">{[0, 1, 2, 3, 4].map(n => <div className="pa-skeleton" key={n} />)}</div> :
            filtered.length === 0 ? <div className="pa-empty"><span><Package size={21} /></span><strong>{query || statusFilter !== "all" ? "No matching shipments" : "No shipments on this page"}</strong><p>{query || statusFilter !== "all" ? "Try a different search or status filter." : "New vendor submissions will appear here."}</p></div> :
              <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th>ORDER</th><th>VENDOR</th><th>SHIP TO</th><th>SUBMITTED</th><th>STATUS</th><th className="align-right">TOTAL</th><th /></tr></thead>
                <tbody>{filtered.map(o => <tr key={o.id} onClick={() => setSelectedId(o.id)} tabIndex={0} onKeyDown={e => { if (e.key === "Enter") setSelectedId(o.id); }} data-testid={`row-order-${o.id}`}>
                  <td><button className="pa-order-link" onClick={e => { e.stopPropagation(); setSelectedId(o.id); }}>{o.reference}</button><small>{o.items.reduce((n, i) => n + i.quantity, 0)} units · {o.items.length} line{ o.items.length === 1 ? "" : "s"}</small></td>
                  <td><span className="pa-vendor-avatar">{o.vendorName.slice(0, 1).toUpperCase()}</span><span className="pa-vendor-name">{o.vendorName}</span></td>
                  <td><strong>{o.shipping.name || "—"}</strong><small>{o.shipping.country || "Destination not set"}</small></td>
                  <td><span className="pa-date">{date(o.submittedAt)}</span></td>
                  <td><Badge tone={toneFor(o)}>{stageLabel(o)}</Badge></td>
                  <td className="align-right pa-total">{money(o.totalCost)}</td><td><ChevronRight size={16} className="pa-row-chevron" /></td>
                </tr>)}</tbody></table></div>}
          <div className="pa-pagination"><span>Showing <b>{total ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)}</b> of <b>{total}</b> orders</span><div><button className="pa-page-button" aria-label="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || listLoading}><ChevronLeft size={16} /></button><span>Page <b>{page}</b> / {pageCount}</span><button className="pa-page-button" aria-label="Next page" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount || listLoading}><ChevronRight size={16} /></button></div></div>
        </Card>
        <footer className="pa-footer"><span>PEPS ANONYMOUS <i>·</i> SUPPLIER FULFILMENT</span><span>Each action is checked against current server-side order state.</span></footer>
      </> : <DetailView order={visibleDetail} loading={detailLoading} error={detailError} onBack={() => setSelectedId(null)} onRetry={() => void loadDetail(selectedId)} trackingNumber={trackingNumber} setTrackingNumber={setTrackingNumber} carrier={carrier} setCarrier={setCarrier} busy={mutationBusy} actionError={actionError} onProcess={startProcessing} onTracking={saveTracking} onRecall={() => { setDialog("recall"); setReason(""); setOverride(false); }} />}
    </div>
    {dialog === "recall" && visibleDetail && <div className="pa-modal-backdrop" role="presentation"><section className="pa-modal" role="dialog" aria-modal="true" aria-labelledby="recall-title">
      <button className="pa-modal-close" onClick={() => setDialog(null)} aria-label="Close"><X size={18} /></button><span className="pa-modal-icon danger"><AlertTriangle size={19} /></span><div className="pa-kicker">RECALL FROM VENDOR</div><h2 id="recall-title">Recall order {visibleDetail.reference}?</h2>
      <p>This removes the shipment from the vendor’s fulfilment list and payment list only. It does not cancel or change the customer’s order.</p>
      {needsOverride(visibleDetail) && <div className="pa-warning-box"><strong>Shipment already started</strong><span>{visibleDetail.trackingNumber ? "Tracking is present" : ""}{visibleDetail.trackingNumber && visibleDetail.images.length ? " · " : ""}{visibleDetail.images.length ? `${visibleDetail.images.length} shipment photo${visibleDetail.images.length === 1 ? "" : "s"} attached` : ""}{visibleDetail.status.toLowerCase().includes("process") ? " · Processing has started" : ""}. Override and a reason are required.</span></div>}
      <label className="pa-label">Reason for recall<textarea className="pa-input pa-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Add the reason for the audit trail" rows={3} /></label>
      {needsOverride(visibleDetail) && <label className="pa-check pa-override"><input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} /> I understand this recall does not cancel the customer order</label>}
      <div className="pa-modal-actions"><button className="pa-button pa-outline" onClick={() => setDialog(null)}>Keep order</button><button className="pa-button pa-danger" data-testid="button-recall-confirm" onClick={recall} disabled={mutationBusy || (needsOverride(visibleDetail) && (!reason.trim() || !override))}>{mutationBusy ? "Recalling…" : "Recall shipment"}</button></div>
    </section></div>}
    {dialog === "resubmit" && <div className="pa-modal-backdrop" role="presentation"><section className="pa-modal pa-modal-wide" role="dialog" aria-modal="true" aria-labelledby="resubmit-title">
      <button className="pa-modal-close" onClick={() => !previewLoading && setDialog(null)} aria-label="Close" disabled={previewLoading}><X size={18} /></button><span className="pa-modal-icon"><PackageCheck size={19} /></span><div className="pa-kicker">VENDOR SUBMISSION</div><h2 id="resubmit-title">{preview ? "Review before submitting" : "Submit orders to a vendor"}</h2>
      {!preview ? <><p>Enter the source order numbers exactly as provided. Peps will preview the vendor shipment before any submission is sent.</p>
        {previewError && <div className="pa-error" role="alert">{previewError}</div>}
        <form onSubmit={requestPreview} className="pa-resubmit-form">
          <label className="pa-label">Vendor<select className="pa-input" value={vendorId} onChange={e => { setVendorId(e.target.value); setPreview(null); }} disabled={previewLoading} required><option value="">Choose a vendor…</option>{vendors.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}</select></label>
          <label className="pa-label">Source order numbers<textarea className="pa-input pa-textarea" value={orderCodes} onChange={e => { setOrderCodes(e.target.value); setPreview(null); }} disabled={previewLoading} rows={3} placeholder="One or more numbers, separated by spaces or commas" required /></label>
          <div className="pa-modal-actions"><button type="button" className="pa-button pa-outline" onClick={() => setDialog(null)} disabled={previewLoading}>Cancel</button><button className="pa-button pa-primary" data-testid="button-review-submission" disabled={previewLoading}>{previewLoading ? <LoaderCircle size={16} className="pa-spin" /> : null}Review shipments</button></div>
        </form></> : <>
          <p>Review the server-generated shipment details. Nothing is sent until you confirm below.</p>
          {previewError && <div className="pa-error" role="alert">{previewError}</div>}
          <div className="pa-preview-list">{preview.shipments.map((shipment, i) => <article className="pa-preview-item pa-preview-shipment" key={`${shipment.id}-${i}`} data-testid={`preview-shipment-${shipment.id}`}>
            <header className="pa-preview-order-heading"><div><strong>{shipment.reference}</strong><span>{shipment.vendorName}</span></div><b>{money(shipment.totalCost)}</b></header>
            <div className="pa-preview-address"><span className="pa-preview-label">SHIP TO</span><address><strong>{shipment.shipping.name || "Recipient not provided"}</strong><span>{shipment.shipping.address || "Address not provided"}</span><span>{shipment.shipping.country}</span>{shipment.shipping.phone && <span>{shipment.shipping.phone}</span>}{shipment.shipping.email && <span>{shipment.shipping.email}</span>}</address></div>
            <div className="pa-preview-items"><div className="pa-preview-item-heading"><span>PRODUCT</span><span>QTY</span><span>UNIT COST</span><span>LINE TOTAL</span></div>
              {shipment.items.map((item, itemIndex) => <div className="pa-preview-product" key={`${item.productName}-${itemIndex}`}><strong>{item.productName}</strong><span>{item.quantity}</span><span>{money(item.unitCost)}</span><b>{money(item.lineTotal)}</b></div>)}
            </div>
            <dl className="pa-preview-costs"><div><dt>Product total</dt><dd>{money(shipment.productCost)}</dd></div><div><dt>Shipping</dt><dd>{money(shipment.shippingCost)}</dd></div><div className="pa-preview-grand-total"><dt>Supplier total</dt><dd>{money(shipment.totalCost)}</dd></div></dl>
          </article>)}</div>
          <div className="pa-modal-actions"><button className="pa-button pa-outline" data-testid="button-edit-submission" onClick={() => setPreview(null)} disabled={mutationBusy}>Back to edit</button><button className="pa-button pa-primary" data-testid="button-confirm-submission" onClick={submitPreview} disabled={mutationBusy || preview.shipments.length === 0}>{mutationBusy ? "Submitting…" : "Confirm vendor submission"}</button></div>
        </>}
    </section></div>}
  </main>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`pa-mark${compact ? " pa-mark-small" : ""}`} aria-label="Peps Anonymous"><span>P</span>{!compact && <div><strong>peps anonymous</strong><small>FULFILMENT WORKSPACE</small></div>}</div>;
}

function DetailView({ order, loading, error, onBack, onRetry, trackingNumber, setTrackingNumber, carrier, setCarrier, busy, actionError, onProcess, onTracking, onRecall }: {
  order: Order | null; loading: boolean; error: string; onBack: () => void; onRetry: () => void;
  trackingNumber: string; setTrackingNumber: (s: string) => void; carrier: string; setCarrier: (s: string) => void;
  busy: boolean; actionError: string; onProcess: () => void; onTracking: () => void; onRecall: () => void;
}) {
  const canProcess = !!order && !order.stale && !terminalStatus(order) && !/ship/i.test(order.status) && !order.trackingNumber;
  const canTrack = !!order && !order.stale && !terminalStatus(order);
  return <div className="pa-detail">
    <button className="pa-back" onClick={onBack}><ArrowLeft size={16} />Back to shipments</button>
    {loading && !order ? <div className="pa-detail-skeleton"><div className="pa-skeleton wide" /><div className="pa-skeleton" /><div className="pa-skeleton" /></div> : error && !order ? <div className="pa-empty pa-detail-empty"><CircleAlert size={22} /><strong>Shipment could not be loaded</strong><p>{error}</p><button className="pa-button pa-outline" onClick={onRetry}>Try again</button></div> : order && <>
      <div className="pa-detail-heading"><div><div className="pa-kicker">{order.vendorName} <span> / </span> SHIPMENT</div><h1>Order {order.reference}</h1><p>Submitted {date(order.submittedAt)}</p></div><div className="pa-detail-heading-actions"><Badge tone={toneFor(order)}>{stageLabel(order)}</Badge><button className="pa-button pa-outline" onClick={onRetry} disabled={loading} aria-label="Refresh shipment"><RefreshCw size={15} className={loading ? "pa-spin" : ""} />Refresh</button></div></div>
      {actionError && <div className="pa-error pa-inline" role="alert">{actionError}</div>}
      {order.stale && <div className="pa-stale-banner"><Clock3 size={17} /><div><strong>Shipment is on hold</strong><span>This submission has changed since the vendor received it. Processing and tracking updates are unavailable.</span></div></div>}
      <div className="pa-detail-grid">
        <div className="pa-main-col">
          <section className="pa-panel"><div className="pa-panel-head"><div><span className="pa-panel-index">01</span><h2>Items &amp; costs</h2></div><span>{order.items.length} line{order.items.length === 1 ? "" : "s"}</span></div>
            <div className="pa-item-head"><span>PRODUCT</span><span>QTY</span><span>UNIT</span><span>LINE TOTAL</span></div>
            {order.items.map((it, i) => <div className="pa-item-row" key={`${it.productName}-${i}`}><div className="pa-product"><span className="pa-product-icon"><Package size={15} /></span><strong>{it.productName}</strong></div><span>{it.quantity}</span><span>{money(it.unitCost)}</span><strong>{money(it.lineTotal)}</strong></div>)}
            <div className="pa-costs"><div><span>Product cost</span><b>{money(order.productCost)}</b></div><div><span>Shipping cost</span><b>{money(order.shippingCost)}</b></div><div className="pa-cost-total"><span>Total cost</span><b>{money(order.totalCost)}</b></div></div>
          </section>
          <section className="pa-panel pa-management"><div className="pa-panel-head"><div><span className="pa-panel-index">02</span><h2>Fulfilment management</h2></div><span>Admin actions</span></div>
            {canProcess && <div className="pa-action-row"><div className="pa-action-icon"><PackageCheck size={17} /></div><div className="pa-action-copy"><strong>Mark as processing</strong><span>Tell the vendor to begin fulfilment.</span></div><Btn onClick={onProcess} disabled={busy} data-testid="button-process">{busy ? "Saving…" : "Start processing"}</Btn></div>}
            {canTrack && <div className="pa-tracking-form"><div className="pa-action-icon"><Truck size={17} /></div><div className="pa-action-copy"><strong>Add tracking details</strong><span>Updates the shipment status for the vendor order.</span></div><div className="pa-tracking-fields"><input className="pa-input" aria-label="Tracking number" placeholder="Tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} data-testid="input-tracking" /><input className="pa-input" aria-label="Carrier" placeholder="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} data-testid="input-carrier" /><button className="pa-button pa-primary" onClick={onTracking} disabled={busy || !trackingNumber.trim() || !carrier.trim()} data-testid="button-save-tracking">{busy ? "Saving…" : "Save tracking"}</button></div></div>}
            {!canProcess && !canTrack && !order.stale && <div className="pa-restricted"><ShieldCheck size={16} />No fulfilment updates are available for this order state.</div>}
            <div className="pa-recall-row"><div><strong>Recall shipment from vendor</strong><span>Removes it from the vendor and payment list. Customer order remains unchanged.</span></div><button className="pa-button pa-outline pa-recall-button" onClick={onRecall} data-testid="button-recall">Recall order</button></div>
          </section>
          <section className="pa-panel"><div className="pa-panel-head"><div><span className="pa-panel-index">03</span><h2>Shipment photos</h2></div><span>{order.images.length} attached</span></div>
            {order.images.length ? <div className="pa-images">{order.images.map(img => <a href={img.url} target="_blank" rel="noreferrer" className="pa-image" key={img.id}><img src={img.url} alt={img.filename} /><span>{img.filename}</span></a>)}</div> : <div className="pa-no-images"><ImageIcon size={16} /><span>No shipment photos attached</span></div>}
          </section>
        </div>
        <aside className="pa-side-col">
          <section className="pa-panel pa-ship-card"><div className="pa-panel-head"><div><span className="pa-panel-index">TO</span><h2>Shipping address</h2></div></div><address><strong>{order.shipping.name || "Recipient not provided"}</strong><span>{order.shipping.address || "Address not provided"}</span><span>{order.shipping.country}</span>{order.shipping.phone && <span>{order.shipping.phone}</span>}{order.shipping.email && <span>{order.shipping.email}</span>}</address></section>
          <section className="pa-panel pa-side-meta"><span className="pa-kicker">SUPPLIER</span><strong>{order.vendorName}</strong><small>Vendor reference · {order.reference}</small><div className="pa-meta-line"><span>Tracking</span><b>{order.trackingNumber || "Not added"}</b></div><div className="pa-meta-line"><span>Carrier</span><b>{order.carrier || "Not set"}</b></div></section>
        </aside>
      </div>
    </>}
  </div>;
}

/* Legacy in-page rules migrated to peps-admin.css.
const styles = `
.pa-root{--pa-ink:#202c43;--pa-navy:#19335b;--pa-blue:#3768a8;--pa-blue-wash:#eaf0f7;--pa-bg:#f2f5f8;--pa-card:#fff;--pa-line:#dce3eb;--pa-muted:#68778b;--pa-faint:#8b98a8;--pa-gold:#c49035;--pa-red:#aa473a;min-height:100dvh;background:var(--pa-bg);color:var(--pa-ink);font-family:'DM Sans',var(--font-sans),sans-serif;font-size:14px}
.pa-root *{box-sizing:border-box}.pa-root button,.pa-root input,.pa-root select,.pa-root textarea{font:inherit}.pa-root button{cursor:pointer}.pa-root button:disabled{cursor:not-allowed;opacity:.55}
.pa-gate{display:flex;min-height:100dvh;flex-direction:column;align-items:center;justify-content:center;padding:28px;background:radial-gradient(ellipse at 50% 0%,#e5edf6 0%,var(--pa-bg) 58%)}
.pa-mark{display:flex;align-items:center;gap:12px;color:var(--pa-navy);margin-bottom:30px}.pa-mark>span{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--pa-navy);color:#fff;font-family:'DM Serif Display',serif;font-size:25px;box-shadow:0 6px 16px #18345b22}.pa-mark strong{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:20px;letter-spacing:-.3px}.pa-mark small{display:block;margin-top:2px;font-size:9px;font-weight:700;letter-spacing:.16em;color:var(--pa-muted)}.pa-mark-small{margin:0}.pa-mark-small>span{width:31px;height:31px;border-radius:9px;font-size:20px}
.pa-gate-card{width:min(100%,426px);padding:36px;background:#fff;border:1px solid var(--pa-line);border-radius:16px;box-shadow:0 18px 60px #20375812}.pa-gate-card h1{margin:9px 0 6px;font-family:'DM Serif Display',serif;font-weight:400;font-size:32px;letter-spacing:-.5px;color:var(--pa-navy)}.pa-gate-card p{margin:0 0 25px;color:var(--pa-muted);line-height:1.6}.pa-kicker{display:flex;align-items:center;gap:7px;color:var(--pa-blue);font-size:10px;font-weight:800;letter-spacing:.13em}.pa-kicker span{color:#b4bfcc}.pa-label{display:block;margin-top:17px;color:#43516a;font-size:12px;font-weight:700}.pa-input{display:block;width:100%;height:42px;margin-top:7px;padding:0 12px;background:#fff;border:1px solid #d8e0e9;border-radius:8px;color:var(--pa-ink);outline:none;transition:border-color .16s,box-shadow .16s}.pa-input:focus{border-color:var(--pa-blue);box-shadow:0 0 0 3px #3768a81a}.pa-code{text-align:center;letter-spacing:.25em;font-size:18px}.pa-check{display:flex;align-items:center;gap:9px;margin:18px 0;color:var(--pa-muted);font-size:12px}.pa-check input{accent-color:var(--pa-navy);width:15px;height:15px}.pa-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:37px;padding:0 13px;border-radius:8px;border:1px solid transparent;font-size:12px;font-weight:700;transition:background .15s,border .15s,transform .15s}.pa-button:hover:not(:disabled){transform:translateY(-1px)}.pa-primary{background:var(--pa-navy);color:white;box-shadow:0 2px 4px #19335b1c}.pa-primary:hover:not(:disabled){background:#244776}.pa-outline{background:#fff;border-color:var(--pa-line);color:#374761}.pa-outline:hover:not(:disabled){background:#f6f8fa;border-color:#bbc8d6}.pa-danger{background:#a94335;color:#fff}.pa-full{width:100%;min-height:44px}.pa-text-button{display:block;border:0;background:none;color:var(--pa-blue);font-size:12px;font-weight:700;margin:15px auto 0}.pa-error{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0;padding:11px 13px;background:#fff0ee;border:1px solid #f0cbc5;border-radius:8px;color:#8e342a;font-size:12px;line-height:1.5}.pa-inline{margin:0 0 14px}.pa-inline button{border:0;background:none;color:inherit}.pa-topbar{height:62px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(18px,4vw,58px);background:#fff;border-bottom:1px solid var(--pa-line)}.pa-brand,.pa-top-right{display:flex;align-items:center;gap:15px}.pa-divider{height:25px;width:1px;background:var(--pa-line)}.pa-workspace-label{font-family:'DM Serif Display',serif;font-size:18px;color:var(--pa-navy)}.pa-secure{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--pa-muted)}.pa-secure span,.pa-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#638e6d;box-shadow:0 0 0 3px #638e6d1a}.pa-icon-button{height:34px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--pa-line);border-radius:8px;background:white;color:#3d4b60;font-size:12px;font-weight:700}.pa-content{width:min(1330px,100%);padding:37px clamp(16px,4vw,58px) 25px;margin:0 auto}.pa-heading-row,.pa-detail-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:23px}.pa-heading-row h1,.pa-detail-heading h1{font-family:'DM Serif Display',serif;font-weight:400;color:var(--pa-navy);font-size:38px;letter-spacing:-.7px;line-height:1.1;margin:9px 0 5px}.pa-heading-row p,.pa-detail-heading p{margin:0;color:var(--pa-muted);font-size:13px}.pa-heading-actions,.pa-detail-heading-actions{display:flex;align-items:center;gap:9px}.pa-updated{font-size:11px;color:var(--pa-faint);margin-right:5px}.pa-summary{display:flex;align-items:center;gap:clamp(18px,3vw,42px);padding:18px 22px;margin-bottom:17px;border-radius:12px;background:#e8eef5;border:1px solid #d9e3ed}.pa-summary-intro{display:flex;align-items:center;gap:12px;margin-right:auto}.pa-summary-mark{display:grid;place-items:center;width:37px;height:37px;background:#fff;border:1px solid #dce3eb;border-radius:10px;color:var(--pa-blue)}.pa-summary-intro strong,.pa-summary-intro span{display:block}.pa-summary-intro strong{font-size:13px;color:var(--pa-navy)}.pa-summary-intro div>span{margin-top:3px;color:var(--pa-muted);font-size:11px}.pa-stat{min-width:110px;border-left:1px solid #d1dce7;padding-left:20px}.pa-stat>span{display:block;font-size:9px;font-weight:800;letter-spacing:.12em;color:#738198}.pa-stat strong{display:block;margin-top:5px;font-variant-numeric:tabular-nums;font-family:'DM Serif Display',serif;font-size:22px;font-weight:400;color:var(--pa-navy)}.pa-stat i{font:400 11px 'DM Sans',sans-serif;color:var(--pa-muted)}.pa-summary-note{display:flex;align-items:center;gap:8px;color:var(--pa-muted);font-size:10px;max-width:170px;line-height:1.4}.pa-list-card{border:1px solid var(--pa-line)!important;border-radius:12px!important;box-shadow:0 2px 8px #142c4810!important;background:var(--pa-card)!important}.pa-toolbar{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:15px 17px;border-bottom:1px solid var(--pa-line)}.pa-search{height:38px;flex:1;max-width:510px;display:flex;align-items:center;gap:9px;padding:0 10px;border:1px solid var(--pa-line);border-radius:8px;background:#fff;color:#748399}.pa-search:focus-within{border-color:#92a9c4;box-shadow:0 0 0 3px #3768a80d}.pa-search input{flex:1;width:0;border:0;outline:none;background:transparent;color:var(--pa-ink);font-size:12px}.pa-search kbd{padding:3px 5px;border:1px solid #e1e6ec;border-radius:4px;color:#91a0b1;font-size:9px}.pa-filters{display:flex;gap:8px}.pa-select-wrap{position:relative}.pa-select-wrap select{height:37px;min-width:134px;appearance:none;padding:0 30px 0 11px;border:1px solid var(--pa-line);border-radius:8px;background:white;color:#47556a;font-size:11px;outline:none}.pa-select-wrap svg{position:absolute;right:10px;top:12px;color:#8290a2;pointer-events:none}.pa-table-label{display:flex;justify-content:space-between;padding:14px 18px 10px}.pa-table-label span:first-child{font-size:9px;letter-spacing:.14em;font-weight:800;color:#6e7e91}.pa-table-label span:last-child{font-size:10px;color:var(--pa-faint)}.pa-table-scroll{overflow-x:auto}.pa-table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}.pa-table thead{background:#f7f9fb}.pa-table th{height:34px;padding:0 14px;color:#8491a1;font-size:9px;letter-spacing:.1em;font-weight:800}.pa-table th:first-child,.pa-table td:first-child{padding-left:20px}.pa-table td{height:64px;padding:9px 14px;border-top:1px solid #edf0f3;font-size:11px;color:#455269}.pa-table tbody tr{cursor:pointer;transition:background .13s}.pa-table tbody tr:hover{background:#f8fafc}.pa-table td small{display:block;margin-top:4px;color:#8995a4;font-size:10px}.pa-order-link{padding:0;border:0;background:none;color:#2a5488;font-size:12px;font-weight:800}.pa-order-link:hover{text-decoration:underline}.pa-vendor-avatar{display:inline-grid;place-items:center;vertical-align:middle;width:27px;height:27px;margin-right:8px;border-radius:8px;background:#eaf0f7;color:#315d91;font-size:11px;font-weight:800}.pa-vendor-name{vertical-align:middle;font-weight:650;color:#455269}.pa-table td>strong{font-size:11px;font-weight:650;color:#455269}.pa-date{color:#758397}.pa-total{font-variant-numeric:tabular-nums;font-weight:750;color:var(--pa-navy)!important}.align-right{text-align:right}.pa-row-chevron{color:#a2adbb}.pa-pagination{display:flex;justify-content:space-between;align-items:center;min-height:54px;padding:0 18px;border-top:1px solid #edf0f3;color:#8390a0;font-size:10px}.pa-pagination b{color:#4a586e}.pa-pagination>div{display:flex;align-items:center;gap:12px}.pa-page-button{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--pa-line);border-radius:7px;background:#fff;color:#53647a}.pa-empty{display:flex;flex-direction:column;align-items:center;padding:50px 18px;text-align:center}.pa-empty>span{display:grid;place-items:center;width:43px;height:43px;margin-bottom:12px;border-radius:12px;background:#eef3f8;color:#7187a1}.pa-empty strong{font-size:13px;color:#33445c}.pa-empty p{margin:5px 0 0;color:#8491a1;font-size:11px}.pa-loading{padding:8px 17px 20px}.pa-skeleton{height:44px;margin-top:10px;border-radius:8px;background:linear-gradient(90deg,#edf1f5,#f6f8fa,#edf1f5);background-size:200% 100%;animation:paShimmer 1.5s ease-in-out infinite}.pa-skeleton.wide{height:62px}.pa-footer{display:flex;justify-content:space-between;padding:17px 2px;color:#98a3b1;font-size:9px;letter-spacing:.04em}.pa-footer span:first-child{font-weight:800;letter-spacing:.1em;color:#7a899c}.pa-footer i{color:var(--pa-gold);font-style:normal}.pa-back{display:flex;align-items:center;gap:7px;padding:0;margin:0 0 23px;border:0;background:none;color:#63748a;font-size:12px;font-weight:700}.pa-back:hover{color:var(--pa-blue)}.pa-detail{animation:paEnter .2s ease-out}.pa-detail-heading{align-items:center}.pa-detail-heading h1{font-size:36px}.pa-detail-heading-actions{align-self:flex-end}.pa-detail-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(245px,.75fr);gap:15px;align-items:start}.pa-main-col,.pa-side-col{display:grid;gap:14px}.pa-panel{background:#fff;border:1px solid var(--pa-line);border-radius:11px;box-shadow:0 2px 7px #142c4809;overflow:hidden}.pa-panel-head{display:flex;justify-content:space-between;align-items:center;padding:15px 17px;border-bottom:1px solid #edf0f3}.pa-panel-head>div{display:flex;align-items:center;gap:10px}.pa-panel-index{font-size:9px;font-weight:800;letter-spacing:.1em;color:#8a9bb0}.pa-panel-head h2{margin:0;color:#2b3c56;font-size:13px;font-weight:750}.pa-panel-head>span{font-size:10px;color:#98a2af}.pa-item-head,.pa-item-row{display:grid;grid-template-columns:minmax(180px,1fr) 54px 105px 110px;align-items:center;gap:10px;padding:0 17px}.pa-item-head{height:34px;background:#f7f9fb;color:#8793a2;font-size:9px;font-weight:800;letter-spacing:.09em}.pa-item-head span:not(:first-child),.pa-item-row>span,.pa-item-row>strong{text-align:right}.pa-item-row{min-height:52px;border-bottom:1px solid #f0f2f5;color:#5d6a7b;font-size:11px;font-variant-numeric:tabular-nums}.pa-item-row>strong{color:#394b63;font-size:11px}.pa-product{display:flex;align-items:center;gap:9px;min-width:0}.pa-product-icon{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:8px;background:#eef3f8;color:#6680a1}.pa-product strong{overflow:hidden;text-overflow:ellipsis;color:#45536a;font-size:11px;font-weight:650}.pa-costs{width:min(310px,100%);margin-left:auto;padding:12px 17px 15px}.pa-costs div{display:flex;justify-content:space-between;margin:5px 0;color:#798698;font-size:11px}.pa-costs b{color:#526075;font-variant-numeric:tabular-nums;font-weight:600}.pa-costs .pa-cost-total{padding-top:9px;margin-top:10px;border-top:1px solid var(--pa-line);color:#30435e;font-size:12px;font-weight:800}.pa-costs .pa-cost-total b{font-family:'DM Serif Display',serif;font-size:20px;color:var(--pa-navy)}.pa-stale-banner{display:flex;gap:11px;align-items:flex-start;margin:-6px 0 15px;padding:13px 15px;border:1px solid #ead7aa;border-radius:9px;background:#fff9e9;color:#8b6928}.pa-stale-banner div strong,.pa-stale-banner div span{display:block}.pa-stale-banner strong{font-size:12px}.pa-stale-banner span{margin-top:3px;font-size:11px;color:#927b4d}.pa-action-row,.pa-tracking-form{display:flex;align-items:center;gap:11px;padding:14px 17px;border-bottom:1px solid #f0f2f5}.pa-action-icon{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:9px;background:#edf3f9;color:#4e719c}.pa-action-copy{min-width:175px}.pa-action-copy strong,.pa-action-copy span{display:block}.pa-action-copy strong{color:#41516a;font-size:11px}.pa-action-copy span{margin-top:3px;color:#8995a4;font-size:10px}.pa-action-row>.pa-button{margin-left:auto}.pa-tracking-form{flex-wrap:wrap}.pa-tracking-fields{display:flex;gap:7px;flex:1;margin-left:auto}.pa-tracking-fields .pa-input{width:31%;height:35px;margin:0;font-size:11px}.pa-tracking-fields .pa-button{flex:none}.pa-restricted{display:flex;gap:8px;align-items:center;padding:16px 18px;color:#8692a1;font-size:11px}.pa-recall-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 17px;background:#fffafa}.pa-recall-row strong,.pa-recall-row span{display:block}.pa-recall-row strong{font-size:11px;color:#79504d}.pa-recall-row span{margin-top:3px;font-size:10px;color:#9b8582}.pa-recall-button{color:#9b4c42;border-color:#eed8d4}.pa-images{display:flex;gap:10px;padding:14px 17px;overflow:auto}.pa-image{width:100px;flex:none;text-decoration:none;color:#64738a;font-size:9px}.pa-image img{display:block;width:100px;height:75px;object-fit:cover;border-radius:7px;background:#eef1f5;border:1px solid #e1e6ec}.pa-image span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:5px}.pa-no-images{display:flex;align-items:center;gap:8px;padding:18px;color:#929eac;font-size:11px}.pa-ship-card address{display:flex;flex-direction:column;gap:8px;padding:16px 18px;font-style:normal;color:#667489;font-size:11px;line-height:1.45}.pa-ship-card address strong{color:#3f4f67;font-size:12px}.pa-side-meta{padding:17px}.pa-side-meta>.pa-kicker{display:block;margin-bottom:8px}.pa-side-meta>strong{display:block;color:#344762;font-size:14px}.pa-side-meta>small{display:block;margin-top:4px;color:#8a96a5;font-size:10px}.pa-meta-line{display:flex;justify-content:space-between;gap:8px;padding-top:11px;margin-top:11px;border-top:1px solid #edf0f3;color:#8793a2;font-size:10px}.pa-meta-line b{color:#526178;text-align:right;font-weight:650}.pa-detail-skeleton{max-width:700px}.pa-detail-empty{margin-top:40px}.pa-detail-empty>svg{color:#7187a1;margin-bottom:12px}.pa-spin{animation:paSpin .9s linear infinite}.pa-modal-backdrop{position:fixed;z-index:50;inset:0;display:grid;place-items:center;padding:18px;background:#15253b66;backdrop-filter:blur(3px)}.pa-modal{position:relative;width:min(100%,470px);max-height:min(90dvh,800px);overflow:auto;padding:28px;background:#fff;border:1px solid #dce3eb;border-radius:15px;box-shadow:0 25px 80px #0f233a35;animation:paEnter .18s ease-out}.pa-modal-wide{width:min(100%,620px)}.pa-modal-close{position:absolute;right:15px;top:15px;display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:7px;background:#f1f4f7;color:#778497}.pa-modal-icon{display:grid;place-items:center;width:38px;height:38px;margin-bottom:16px;border-radius:11px;background:#eaf0f7;color:#416c9e}.pa-modal-icon.danger{background:#fbefed;color:#a94b40}.pa-modal h2{margin:8px 0;font-family:'DM Serif Display',serif;font-weight:400;font-size:28px;color:var(--pa-navy)}.pa-modal>p{margin:0 0 16px;color:#6f7d90;font-size:12px;line-height:1.65}.pa-warning-box{padding:11px 12px;margin:14px 0;border:1px solid #ecd8a8;border-radius:8px;background:#fff9e9;color:#806020}.pa-warning-box strong,.pa-warning-box span{display:block}.pa-warning-box strong{font-size:11px}.pa-warning-box span{margin-top:4px;font-size:10px;line-height:1.5}.pa-textarea{height:auto;min-height:76px;resize:vertical;padding:10px 12px;line-height:1.5}.pa-override{padding:10px;border-radius:7px;background:#fff8e7}.pa-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:21px}.pa-resubmit-form{margin-top:8px}.pa-preview-list{max-height:310px;overflow:auto;border:1px solid var(--pa-line);border-radius:9px}.pa-preview-item{display:flex;justify-content:space-between;gap:10px;padding:12px 13px;border-bottom:1px solid #edf0f3}.pa-preview-item:last-child{border:0}.pa-preview-item strong,.pa-preview-item span,.pa-preview-item small{display:block}.pa-preview-item strong{color:#345170;font-size:12px}.pa-preview-item span{margin-top:3px;color:#68778b;font-size:10px}.pa-preview-item small{margin-top:4px;color:#929eac;font-size:9px}.pa-preview-item>b{flex:none;color:var(--pa-navy);font-size:12px}.pa-modal .pa-error{margin:12px 0}.pa-retry-link{font-weight:700;text-decoration:underline}.pa-root .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes paSpin{to{transform:rotate(360deg)}}@keyframes paShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}@keyframes paEnter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:900px){.pa-summary-note{display:none}.pa-detail-grid{grid-template-columns:minmax(0,1.4fr) minmax(220px,.8fr)}.pa-tracking-fields{flex-basis:calc(100% - 45px);margin-left:43px}.pa-tracking-fields .pa-input{flex:1;width:auto}}
@media(max-width:680px){.pa-topbar{height:56px;padding:0 14px}.pa-secure{display:none}.pa-content{padding:25px 13px 18px}.pa-heading-row,.pa-detail-heading{align-items:flex-start;flex-direction:column;margin-bottom:17px}.pa-heading-row h1,.pa-detail-heading h1{font-size:32px}.pa-heading-actions{width:100%;flex-wrap:wrap}.pa-updated{width:100%;margin:0 0 2px}.pa-heading-actions .pa-button{flex:1}.pa-summary{gap:13px;flex-wrap:wrap;padding:14px}.pa-summary-intro{width:100%;margin:0}.pa-stat{flex:1;padding-left:12px;min-width:80px}.pa-stat:first-of-type{border-left:0;padding-left:0}.pa-summary-note{display:flex;max-width:none;flex:1}.pa-toolbar{align-items:stretch;flex-direction:column;padding:12px}.pa-search{max-width:none}.pa-filters>*{flex:1}.pa-select-wrap select{width:100%;min-width:0}.pa-table{min-width:760px}.pa-table th:first-child,.pa-table td:first-child{padding-left:13px}.pa-pagination{padding:0 12px}.pa-pagination>div{gap:7px}.pa-footer{gap:12px;flex-direction:column}.pa-detail-heading-actions{align-self:flex-start}.pa-detail-grid{grid-template-columns:1fr}.pa-side-col{grid-row:1}.pa-item-head,.pa-item-row{grid-template-columns:minmax(125px,1fr) 35px 78px 82px;gap:6px;padding-left:10px;padding-right:10px}.pa-item-head{font-size:8px}.pa-item-row{font-size:10px}.pa-product strong{font-size:10px}.pa-costs{padding-right:12px}.pa-tracking-form{align-items:flex-start}.pa-tracking-form .pa-action-copy{flex:1}.pa-tracking-fields{flex-basis:100%;margin:0;flex-wrap:wrap}.pa-tracking-fields .pa-input{min-width:calc(50% - 4px)}.pa-tracking-fields .pa-button{flex:1}.pa-modal{padding:23px 18px}.pa-gate{justify-content:flex-start;padding-top:14vh}.pa-gate-card{padding:27px 22px}.pa-workspace-label{font-size:15px}.pa-icon-button{padding:0 8px}.pa-icon-button span{display:none}}
@media(prefers-reduced-motion:reduce){.pa-root *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;*/
