import React, { useMemo } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import {
  clearPage, dateFilterValid, fmtDate, isEligible, MAX_SELECTION, moneyOf, orderState, paginate, selectPage,
  signedMoneyOf, toggleOne, type Filters, type LedgerOrder, type PaymentState,
} from "./model";
import { FulfilmentText, SupplierBadge, TAB_LABEL } from "./StatusBadge";
import { tabKeys } from "./tabKeys";
import { inputCls, inputStyle } from "../../reshipper-payouts/ui";

export const EMPTY_FILTERS: Filters = { query: "", payment: "all", fulfilment: "all", from: "", to: "" };
const TABS: ("all" | PaymentState)[] = ["all", "owed", "paid", "needs_review", "not_owed"];

export function Pager({ page, pages, onPage, prefix }: { page: number; pages: number; onPage: (p: number) => void; prefix: string }) {
  if (pages <= 1) return null;
  return <div className="flex items-center justify-end gap-2 text-xs">
    <button type="button" className="pap-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid={`${prefix}-prev`}>Previous</button>
    <span style={{ color: "var(--t-subtle)" }}>Page {page} of {pages}</span>
    <button type="button" className="pap-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid={`${prefix}-next`}>Next</button>
  </div>;
}

export function LedgerOrders({ orders, visible, filters, onFilters, page, onPage, selected, onSelected, locked, note, onNote, onOpen, activeId }: {
  orders: LedgerOrder[]; visible: LedgerOrder[]; filters: Filters; onFilters: (f: Filters) => void; page: number; onPage: (p: number) => void;
  selected: Set<string>; onSelected: (next: Set<string>) => void; locked: boolean; note: string | null; onNote: (n: string | null) => void;
  onOpen: (id: string) => void; activeId: string | null;
}) {
  const f = filters;
  const statuses = useMemo(() => Array.from(new Set(orders.map((o) => o.status))).sort(), [orders]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, owed: 0, paid: 0, needs_review: 0, not_owed: 0 };
    orders.forEach((o) => { c[orderState(o)]++; });
    return c;
  }, [orders]);
  const view = paginate(visible, page);
  const pageIds = new Set(view.rows.map((o) => o.id));
  const hidden = Array.from(selected).filter((id) => !pageIds.has(id)).length;
  const pageEligible = view.rows.filter(isEligible);
  const set = (k: keyof Filters, v: string) => { onFilters({ ...f, [k]: v }); onPage(1); };
  const badDate = !dateFilterValid(f.from) || !dateFilterValid(f.to);
  const filtered = !!(f.query || f.fulfilment !== "all" || f.from || f.to);
  const allOnPageSelected = pageEligible.length > 0 && pageEligible.every((o) => selected.has(o.id));

  return <section aria-label="Order ledger" className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
    <div role="tablist" onKeyDown={tabKeys} aria-label="Supplier payment status" className="pap-tabs border-b px-2 pt-1" style={{ borderColor: "var(--t-border)" }}>
      {TABS.map((t) => <button key={t} type="button" role="tab" tabIndex={f.payment === t ? 0 : -1} aria-selected={f.payment === t} className="pap-tab" data-testid={`payment-state-${t}`}
        onClick={() => set("payment", t)}>{t === "all" ? "All" : TAB_LABEL[t]}<span className="pap-count">{counts[t]}</span></button>)}
    </div>
    <div className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_150px_auto] lg:items-end" style={{ borderColor: "var(--t-border)" }}>
      <label className="relative block">
        <span className="sr-only">Search order or reference</span>
        <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--t-subtle)" }} />
        <input type="search" className={inputCls + " pl-9 !min-h-[36px]"} style={inputStyle} placeholder="Search order code, reference or member" value={f.query} onChange={(e) => set("query", e.target.value)} data-testid="payment-filter-search" />
      </label>
      <select aria-label="Fulfilment status" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={f.fulfilment} onChange={(e) => set("fulfilment", e.target.value)} data-testid="payment-filter-fulfilment">
        <option value="all">All fulfilment</option>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <label className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Submitted from<input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={f.from} onChange={(e) => set("from", e.target.value)} data-testid="payment-filter-from" /></label>
      <label className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Submitted to<input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={f.to} onChange={(e) => set("to", e.target.value)} data-testid="payment-filter-to" /></label>
      <button type="button" className="pap-btn justify-center" disabled={!filtered} onClick={() => { onFilters({ ...f, query: "", fulfilment: "all", from: "", to: "" }); onPage(1); }} data-testid="payment-filter-clear"><X className="h-3.5 w-3.5" />Clear filters</button>
    </div>
    {badDate && <p role="alert" className="px-3 pt-2 text-xs" style={{ color: "#B42318" }}>Date filter is invalid and has been ignored.</p>}

    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-xs" style={{ background: "var(--t-blue-03)" }}>
      <button type="button" disabled={locked || !pageEligible.length || allOnPageSelected} className="pap-btn !min-h-[28px] !text-xs"
        onClick={() => { const r = selectPage(selected, view.rows); onSelected(r.next); onNote(r.skipped ? `${r.skipped} eligible on this page not added: the ${MAX_SELECTION}-order receipt limit is reached.` : null); }} data-testid="payment-select-page">
        Select eligible on this page ({pageEligible.length})
      </button>
      <button type="button" disabled={locked || !view.rows.some((o) => selected.has(o.id))} className="font-semibold underline-offset-2 hover:underline disabled:opacity-40" onClick={() => { onSelected(clearPage(selected, view.rows)); onNote(null); }} data-testid="payment-clear-page">Clear this page</button>
      {selected.size > 0 && <button type="button" disabled={locked} className="font-semibold underline-offset-2 hover:underline disabled:opacity-40" onClick={() => { onSelected(new Set()); onNote(null); }} data-testid="payment-clear-all">Clear all</button>}
      <span style={{ color: "var(--t-subtle)" }}>Selection is page-scoped · max {MAX_SELECTION} orders per receipt</span>
      {hidden > 0 && <span className="font-semibold" style={{ color: "#B4770E" }} data-testid="payment-hidden-selected">{hidden} selected on other pages or hidden by filters</span>}
    </div>
    {note && <p role="status" className="px-3 pb-2 text-xs" style={{ color: "#B4770E" }}>{note}</p>}

    {visible.length === 0
      ? <div className="m-3 rounded-lg border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>
          {orders.length ? <>No orders match this tab or filter.{(filtered || f.payment !== "all") && <button type="button" className="ml-2 font-semibold underline" onClick={() => { onFilters({ ...f, query: "", payment: "all", fulfilment: "all", from: "", to: "" }); onPage(1); }}>Show all orders</button>}</> : "No supplier submissions for this vendor yet."}
        </div>
      : <div className="relative overflow-x-auto"><table className="pap-table">
        <thead><tr>
          <th className="w-8"><span className="sr-only">Select</span></th><th>Order</th><th>Submitted</th><th>Fulfilment</th><th>Supplier payment</th>
          <th className="pap-num">Supplier cost</th><th className="pap-num">Sold (products)</th><th className="pap-num">Est. product profit</th><th className="w-8"><span className="sr-only">Open</span></th>
        </tr></thead>
        <tbody>
          {view.rows.map((o) => {
            const st = orderState(o); const sel = selected.has(o.id); const p = o.profit;
            const codes = (o.sourceOrders ?? []).map((s) => s.code).filter(Boolean) as string[];
            const cost = moneyOf(o.totalCost); const sold = moneyOf(p?.salesUsd);
            const profitTone = !p?.amountUsd ? "#B4770E" : p.amountUsd.startsWith("-") ? "#B42318" : "#15803D";
            return <tr key={o.id} data-selected={sel} aria-current={activeId === o.id ? "true" : undefined} onClick={() => onOpen(o.id)}>
              <td className="pap-c-sel" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="h-4 w-4 accent-[var(--t-blue-deep)]" aria-label={`Select ${o.reference}`} checked={sel} disabled={locked || (!sel && !isEligible(o))}
                  onChange={() => onSelected(toggleOne(selected, o))} data-testid={`payment-order-${o.id}`} />
              </td>
              <td className="pap-c-ref min-w-0">
                <button type="button" className="font-mono text-[13px] font-semibold break-all text-left hover:underline" aria-label={`Details for ${o.reference}`} onClick={(e) => { e.stopPropagation(); onOpen(o.id); }} data-testid={`payment-expand-${o.id}`}>{o.reference}</button>
                <p className="max-w-[260px] truncate text-[11.5px]" style={{ color: "var(--t-subtle)" }} title={codes.join(", ")}>
                  {o.sourceType === "shared" ? `Shared · ${codes.length} orders · ` : ""}{codes.length ? codes.slice(0, 2).join(", ") + (codes.length > 2 ? ` +${codes.length - 2}` : "") : "No order code"}
                </p>
                <p className="truncate text-[11px]" style={{ color: "var(--t-subtle)" }}>{(o.sourceOrders ?? []).map(s => s.username).filter(Boolean).join(", ")}</p>
              </td>
              <td className="whitespace-nowrap text-[12.5px]"><span className="pap-ml">Submitted</span>{fmtDate(o.submittedAt)}</td>
              <td><span className="pap-ml">Fulfilment</span><FulfilmentText status={o.status} /></td>
              <td><span className="pap-ml">Supplier payment</span><SupplierBadge state={st} />{(o.stale || o.reviewReason) && <span className="block mt-0.5 text-[11px]" style={{ color: "#B4770E" }}>{o.stale ? "Stale · awaiting resubmission" : "See details"}</span>}</td>
              <td className="pap-num font-semibold" style={{ color: cost === "Unavailable" ? "#B4770E" : "var(--t-text)" }}><span className="pap-ml">Supplier cost</span>{cost}</td>
              <td className="pap-num" data-testid={`payment-sold-price-${o.id}`}><span className="pap-ml">Sold price · products only</span><span style={{ color: sold === "Unavailable" ? "#B4770E" : "var(--t-text)" }}>{sold}</span><span className="sr-only"> Sold price, products only</span></td>
              <td className="pap-num pap-c-wide" data-testid={`payment-profit-${o.id}`}><span className="pap-ml">Est. product profit</span>
                <span className="font-semibold" style={{ color: profitTone }}>{signedMoneyOf(p?.amountUsd)}</span>
                {(p?.reason || !p) && <span className="block max-w-[180px] truncate text-[10.5px] md:ml-auto" style={{ color: "#8A5A00" }} title={p?.reason || undefined}>{p?.reason || "Profit details unavailable; refresh."}</span>}
              </td>
              <td className="pap-c-go" onClick={(e) => e.stopPropagation()}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </td>
            </tr>;
          })}
        </tbody>
      </table></div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>
      <span data-testid="payment-result-count">{visible.length} of {orders.length} orders{visible.length ? ` · showing ${(view.page - 1) * 25 + 1}–${(view.page - 1) * 25 + view.rows.length}` : ""}</span>
      <Pager page={view.page} pages={view.pages} onPage={onPage} prefix="payment-page" />
    </div>
  </section>;
}
