import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Landmark, RefreshCw, Wallet as WalletIcon } from "lucide-react";
import { adminAuth } from "../../lib/admin-auth";
import { filterOrders, hasReviewToken, isLedger, money, PAGE_SIZE, parsePaidAt, selectedTotal, summarize, toggleOne, type Filters, type LedgerData, type LedgerOrder } from "./peps-anon-payment/model";
import { LedgerSummary } from "./peps-anon-payment/LedgerSummary";
import { EMPTY_FILTERS, LedgerOrders } from "./peps-anon-payment/LedgerOrders";
import { ReceiptDrawer, ReceiptHistory } from "./peps-anon-payment/ReceiptHistory";
import { RecordPaymentPanel, type Draft, type PaymentForm } from "./peps-anon-payment/RecordPaymentPanel";
import { OrderDrawer } from "./peps-anon-payment/OrderDrawer";
import { Notice, Overlay } from "./peps-anon-payment/Overlay";
import { WalletList } from "./peps-anon-payment/WalletList";
import { tabKeys } from "./peps-anon-payment/tabKeys";
import { inputCls, inputStyle, Skeleton } from "../reshipper-payouts/ui";

const EMPTY_FORM: PaymentForm = { walletId: "", amount: "", txid: "", paidAt: "", note: "" };
type Msg = { ok: boolean; text: string } | null;

async function request(path: string, init?: RequestInit) {
  const response = await adminAuth.request(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export default function VendorPaymentsAdmin({ active = true }: { active?: boolean } = {}) {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [data, setData] = useState<LedgerData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<PaymentForm>(EMPTY_FORM);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [voidId, setVoidId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<LedgerOrder | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [reason, setReason] = useState("");
  const [ledgerKey, setLedgerKey] = useState(0);
  // Navigation state (vendor-scoped, survives view switches and drawer close)
  const [view, setView] = useState<"orders" | "history">("orders");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selNote, setSelNote] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [walletsOpen, setWalletsOpen] = useState(false);
  const [pendingVendor, setPendingVendor] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const vendorRef = useRef(vendorId);
  vendorRef.current = vendorId;

  const load = useCallback(async (id: string) => {
    const run = ++generation.current;
    setLoading(true);
    setDraft(null);
    setRemoveTarget(null);
    setSelected(new Set());
    setSelNote(null);
    setLoadError(null);
    try {
      const result = await request(`/api/admin/vendor-payments${id ? `?vendorId=${encodeURIComponent(id)}` : ""}`);
      if (!isLedger(result)) throw new Error("Could not load payment details. Refresh and try again.");
      if (run !== generation.current) return;
      setVendors(result.vendors);
      setData(result);
      setForm((f) => (result.wallets.some((w) => w.id === f.walletId) ? f : { ...f, walletId: "" }));
      setLedgerKey((k) => k + 1);
    } catch (error) {
      if (run !== generation.current) return;
      setData(null);
      setRecordOpen(false);
      setDetailId(null);
      setReceiptId(null);
      setLoadError(error instanceof Error ? error.message : "Could not load payments");
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(vendorId);
    return () => { generation.current++; };
  }, [vendorId, load]);

  const transferDirty = !!(draft || form.amount || form.txid || form.paidAt || form.note);
  const dirty = !!(transferDirty || voidId || removeTarget || selected.size || busy);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const onFocus = () => { if (activeRef.current && vendorRef.current && !dirtyRef.current && !lock.current) void load(vendorRef.current); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Protect in-progress transfer drafts from browser refresh / tab close.
  const unloadRef = useRef(false);
  unloadRef.current = transferDirty || busy;
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (!unloadRef.current) return; e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const ledger = vendorId && data && data.vendorId === vendorId ? data : null;
  const summary = useMemo(() => (ledger ? summarize(ledger.orders, ledger.summary) : null), [ledger]);
  const { orders: chosen, total } = useMemo(() => selectedTotal(ledger?.orders ?? [], selected), [ledger, selected]);
  const visible = useMemo(() => filterOrders(ledger?.orders ?? [], filters), [ledger, filters]);
  const wallet = ledger?.wallets.find((w) => w.id === form.walletId);
  const paid = parsePaidAt(form.paidAt);
  const tokenProblem = chosen.filter((o) => !hasReviewToken(o)).length;
  const ready = !loading && !busy && !!wallet && chosen.length > 0 && chosen.length === selected.size && tokenProblem === 0 && paid.ok &&
    /^\d+(?:\.\d+)?$/.test(form.amount.trim()) && /[1-9]/.test(form.amount) && !!form.txid.trim();
  const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? "this vendor";

  function applyVendor(id: string) {
    generation.current++;
    setVendorId(id);
    setData(null);
    setForm(EMPTY_FORM);
    setDraft(null);
    setSelected(new Set());
    setVoidId("");
    setRemoveTarget(null);
    setReason("");
    setMessage(null);
    setLoadError(null);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSelNote(null);
    setDetailId(null);
    setReceiptId(null);
    setRecordOpen(false);
    setWalletsOpen(false);
    setPendingVendor(null);
    setView("orders");
  }
  function changeVendor(id: string) {
    if (id === vendorId) return;
    if (transferDirty) { setPendingVendor(id); return; }
    applyVendor(id);
  }

  function review() {
    if (!ready || removeTarget || voidId || lock.current || !wallet || !paid.ok || !chosen.every(hasReviewToken)) return;
    setDraft({
      vendorId,
      walletId: wallet.id,
      walletSnapshot: { currency: wallet.currency, network: wallet.network, address: wallet.address },
      submissionIds: chosen.map((o) => o.id),
      orderSnapshots: chosen.map((o) => ({ submissionId: o.id, reviewToken: o.reviewToken as string })),
      txid: form.txid.trim(),
      cryptoAmount: form.amount.trim(),
      ...(paid.iso ? { paidAt: paid.iso } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    });
    setMessage(null);
  }

  async function mutate(isVoid: boolean) {
    if (lock.current || removeTarget || (isVoid ? !voidId || !reason.trim() : !draft)) return;
    const forVendor = vendorId;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await request(isVoid ? `/api/admin/vendor-payments/${encodeURIComponent(voidId)}/void` : "/api/admin/vendor-payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isVoid ? { reason: reason.trim() } : draft),
      });
      if (vendorRef.current !== forVendor) return;
      setDraft(null);
      setForm(EMPTY_FORM);
      setVoidId("");
      setReason("");
      if (!isVoid) setRecordOpen(false);
      setMessage({ ok: true, text: isVoid ? "Payment record voided." : "Payment recorded." });
      await load(forVendor);
    } catch (error) {
      if (vendorRef.current === forVendor) setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save payment" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function removeSubmission() {
    if (lock.current || busy || draft || voidId || !removeTarget || removeTarget.canRemove !== true) return;
    if (removeTarget.requiresRemovalOverride && !removeReason.trim()) return;
    const forVendor = vendorId;
    const submissionId = removeTarget.id;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await request(`/api/admin/vendor-portal/orders/${encodeURIComponent(submissionId)}`, {
        method: "DELETE",
        ...(removeTarget.requiresRemovalOverride ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ override: true, reason: removeReason.trim() }) } : {}),
      });
      if (vendorRef.current !== forVendor) return;
      setRemoveTarget(null);
      setDetailId(null);
      await load(forVendor);
      if (vendorRef.current === forVendor) {
        setMessage({ ok: true, text: `Supplier submission ${removeTarget.reference} removed from the vendor portal and payment list. Customer order and historical receipts remain.` });
      }
    } catch (error) {
      if (vendorRef.current === forVendor) setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not remove supplier submission" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function copy(address: string) {
    const fail = () => setMessage({ ok: false, text: "Could not copy address. Select and copy it above." });
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clip?.writeText) return fail();
    clip.writeText(address).then(() => setMessage({ ok: true, text: "Wallet address copied." }), fail);
  }

  // Detail drawer follows the filtered set; keep list page in sync so close returns to the same place.
  const detailIndex = detailId ? visible.findIndex((o) => o.id === detailId) : -1;
  const detailOrder = detailId ? (visible[detailIndex] ?? ledger?.orders.find((o) => o.id === detailId) ?? null) : null;
  function openDetail(id: string) { setMessage(null); setDetailId(id); }
  function step(delta: number) {
    if (removeTarget || busy) return;
    const next = visible[detailIndex + delta];
    if (!next) return;
    setDetailId(next.id);
    setPage(Math.floor((detailIndex + delta) / PAGE_SIZE) + 1);
  }
  function closeDetail() { if (busy) return; setRemoveTarget(null); setDetailId(null); }

  const voidTarget = ledger?.payments.find((p) => p.id === voidId);
  const receipt = receiptId ? ledger?.payments.find((p) => p.id === receiptId) ?? null : null;
  const overlayOpen = !!(recordOpen || (detailOrder && ledger) || receipt || walletsOpen);
  const locked = busy || !!draft || !!voidId || !!removeTarget;

  return <section className="pap-root space-y-4" data-testid="vendor-payments-admin">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Supplier accounts</p>
        <h2 className="flex items-center gap-2 text-xl font-bold" style={{ color: "var(--t-text)" }}><Landmark className="h-5 w-5" style={{ color: "var(--t-blue)" }} />Peps Anon Payment</h2>
        <p className="mt-0.5 max-w-xl text-xs" style={{ color: "var(--t-subtle)" }}>Supplier-order costs and receipts for transfers sent outside this website. Recording never sends funds, verifies a blockchain, or changes customer payment or fulfilment status.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[200px] text-xs" style={{ color: "var(--t-subtle)" }}>Vendor
          <select className={inputCls + " !min-h-[36px]"} style={inputStyle} data-testid="payment-vendor" value={vendorId} disabled={busy} onChange={(e) => changeVendor(e.target.value)}>
            <option value="">Select vendor</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        {ledger && <button type="button" className="pap-btn" onClick={() => { setMessage(null); setWalletsOpen(true); }} data-testid="payment-wallets-open">
          <WalletIcon className="h-3.5 w-3.5" />Wallets ({ledger.wallets.length}){!ledger.wallets.length && <span className="h-2 w-2 rounded-full" style={{ background: "#E9A020" }} aria-label="No wallet saved" />}
        </button>}
        <button type="button" className="pap-btn" disabled={busy || loading || transferDirty} title={transferDirty ? "Finish or discard the payment record before refreshing." : undefined} onClick={() => { if (!transferDirty && !lock.current) void load(vendorId); }} data-testid="payment-refresh"><RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />Refresh payments & wallets</button>
      </div>
    </header>

    {pendingVendor !== null && <div role="alertdialog" aria-label="Discard payment draft" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-l-4 px-3 py-2 text-sm" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 9%, var(--t-surface))" }}>
      <span>You have an unsaved payment record for {vendorName}. Switching vendor discards it and clears the selection.</span>
      <span className="flex gap-2">
        <button type="button" className="pap-btn" onClick={() => setPendingVendor(null)} data-testid="payment-discard-cancel">Keep editing</button>
        <button type="button" className="pap-btn pap-btn-danger" onClick={() => applyVendor(pendingVendor)} data-testid="payment-discard-confirm">Discard and switch</button>
      </span>
    </div>}

    {!overlayOpen && <Notice message={message} />}
    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "#ef4444", background: "color-mix(in srgb, #ef4444 7%, var(--t-surface))" }} data-testid="payment-load-error">
      <span>{loadError}</span>
      <button type="button" className="font-semibold underline" onClick={() => void load(vendorId)} data-testid="payment-retry">Retry</button>
    </div>}
    {!vendorId && !loadError && <p className="rounded-xl border border-dashed p-10 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>Choose a vendor to see their supplier-cost ledger.</p>}
    {vendorId && loading && !ledger && <Skeleton />}

    {ledger && summary && <>
      <LedgerSummary summary={summary} />

      <div role="tablist" onKeyDown={tabKeys} aria-label="Peps Anon Payment views" className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        {([["orders", `Orders (${ledger.orders.length})`], ["history", `Payment history (${ledger.payments.length})`]] as const).map(([k, label]) =>
          <button key={k} id={`payment-tab-${k}`} aria-controls={`payment-panel-${k}`} tabIndex={view === k ? 0 : -1} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} data-testid={`payment-tab-${k}`}
            className="rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
            style={view === k ? { background: "var(--t-blue-deep)", color: "#fff" } : { color: "var(--t-subtle)" }}>{label}</button>)}
      </div>

      <div id="payment-panel-orders" hidden={view !== "orders"} role="tabpanel" aria-labelledby="payment-tab-orders">
        <LedgerOrders orders={ledger.orders} visible={visible} filters={filters} onFilters={setFilters} page={page} onPage={setPage}
          selected={selected} onSelected={setSelected} locked={locked} note={selNote} onNote={setSelNote} onOpen={openDetail} activeId={detailId} />
      </div>
      <div id="payment-panel-history" hidden={view !== "history"} role="tabpanel" aria-labelledby="payment-tab-history">
        <ReceiptHistory key={`h-${ledgerKey}`} payments={ledger.payments} openId={receiptId} onOpen={(id) => { setMessage(null); setReceiptId(id); }} />
      </div>

      {view === "orders" && selected.size > 0 && <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 shadow-lg"
        style={{ borderColor: selected.size ? "var(--t-blue-30)" : "var(--t-border)", background: "var(--t-surface)" }} data-testid="payment-summary-selected">
        <p className="text-sm">
          {selected.size > 0
            ? <><strong data-testid="payment-selected-count">{selected.size} selected</strong><span style={{ color: "var(--t-subtle)" }}> · supplier total </span><strong className="tabular-nums" style={{ color: "var(--t-blue-deep)" }}>{money(total)}</strong> <span className="text-xs" style={{ color: "var(--t-subtle)" }}>USD</span></>
            : <span style={{ color: "var(--t-subtle)" }}>Select eligible orders in To pay to record a payment.</span>}
          {draft && <span className="ml-2 text-xs font-semibold" style={{ color: "#B4770E" }}>Draft awaiting confirmation</span>}
        </p>
        <button type="button" className="pap-btn pap-btn-primary" disabled={!selected.size || !!removeTarget || !!voidId || busy} onClick={() => { setMessage(null); setRecordOpen(true); }} data-testid="payment-record-open">
          {draft ? "Continue payment record" : "Record payment"}
        </button>
      </div>}

      {active && walletsOpen && <Overlay title="Vendor receiving wallets" subtitle={`Saved by ${vendorName} in their Settings`} closeTestId="payment-wallets-close" onClose={() => setWalletsOpen(false)}>
        <Notice message={message} />
        <WalletList wallets={ledger.wallets} activeId={form.walletId} onCopy={copy} />
      </Overlay>}

      {active && detailOrder && <OrderDrawer order={detailOrder} index={detailIndex < 0 ? 0 : detailIndex} total={detailIndex < 0 ? 1 : visible.length}
        onPrev={() => step(-1)} onNext={() => step(1)} onClose={closeDetail} message={message}
        selected={selected.has(detailOrder.id)} onToggle={() => setSelected((s) => toggleOne(s, detailOrder))} locked={locked} busy={busy}
        onRemove={(order) => { if (order.canRemove === true && !busy && !draft && !voidId && !lock.current) { setRemoveTarget(order); setRemoveReason(""); setMessage(null); } }}
        removeTarget={removeTarget} onRemoveCancel={() => setRemoveTarget(null)} onRemoveConfirm={() => void removeSubmission()} removeBusy={busy}
        removeReason={removeReason} onRemoveReason={setRemoveReason} />}

      {active && recordOpen && <RecordPaymentPanel wallets={ledger.wallets} form={form} onForm={(p) => setForm((f) => ({ ...f, ...p }))} chosen={chosen} total={total}
        draft={draft} busy={busy || !!removeTarget || !!voidId} ready={ready && !removeTarget && !voidId} dateError={!paid.ok} tokenProblem={tokenProblem}
        onReview={review} onConfirm={() => void mutate(false)} onEdit={() => setDraft(null)} onClose={() => setRecordOpen(false)}
        onDiscard={() => { if (busy || lock.current) return; setForm(EMPTY_FORM); setDraft(null); setRecordOpen(false); setMessage(null); }} canClose={!busy}
        message={message} onCopy={copy} vendorName={vendorName} />}

      {active && receipt && <ReceiptDrawer p={receipt} message={message} busy={busy} locked={busy || !!draft || !!removeTarget}
        onClose={() => { if (busy) return; setReceiptId(null); setVoidId(""); setReason(""); }}
        voiding={!!voidTarget && voidTarget.id === receipt.id} onVoidStart={() => { setVoidId(receipt.id); setReason(""); setMessage(null); }}
        onVoidCancel={() => setVoidId("")} reason={reason} onReason={setReason} onVoidConfirm={() => void mutate(true)} />}
    </>}
  </section>;
}
