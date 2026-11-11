import React from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Overlay, Notice } from "./Overlay";
import { OrderBreakdown } from "./OrderBreakdown";
import { FulfilmentText, SupplierBadge } from "./StatusBadge";
import { isEligible, moneyOf, orderState, signedMoneyOf, type LedgerOrder } from "./model";

export function OrderDrawer({ order, index, total, onPrev, onNext, onClose, selected, onToggle, locked, message,
  onRemove, removeTarget, onRemoveCancel, onRemoveConfirm, removeBusy, removeReason, onRemoveReason, busy }: {
  order: LedgerOrder; index: number; total: number; onPrev: () => void; onNext: () => void; onClose: () => void;
  selected: boolean; onToggle: () => void; locked: boolean; message: { ok: boolean; text: string } | null;
  onRemove: (o: LedgerOrder) => void; removeTarget: LedgerOrder | null; onRemoveCancel: () => void; onRemoveConfirm: () => void; removeBusy: boolean;
  removeReason: string; onRemoveReason: (r: string) => void; busy: boolean;
}) {
  const o = order; const st = orderState(o); const p = o.profit;
  const removing = removeTarget?.id === o.id;
  const stat = (label: string, value: string, tone?: string, id?: string) => <div className="min-w-0 rounded-lg border px-3 py-2" style={{ borderColor: "var(--t-border)" }} data-testid={id}>
    <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{label}</p>
    <p className="text-[15px] font-bold tabular-nums" style={{ color: tone ?? "var(--t-text)" }}>{value}</p>
  </div>;
  return <Overlay testId="payment-order-drawer" closeTestId="payment-detail-close" canClose={!busy} onClose={onClose}
    title={<span className="font-mono">{o.reference}</span>}
    subtitle={<span>Order {index + 1} of {total} in current filter</span>}
    headerExtra={<div className="flex gap-1">
      <button type="button" className="pap-btn !px-2" aria-label="Previous order" disabled={index <= 0 || removing} onClick={onPrev} data-testid="payment-detail-prev"><ChevronLeft className="h-4 w-4" /></button>
      <button type="button" className="pap-btn !px-2" aria-label="Next order" disabled={index >= total - 1 || removing} onClick={onNext} data-testid="payment-detail-next"><ChevronRight className="h-4 w-4" /></button>
    </div>}
    footer={<div className="flex flex-wrap items-center justify-between gap-2">
      <label className="inline-flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 accent-[var(--t-blue-deep)]" checked={selected} disabled={locked || (!selected && !isEligible(o))} onChange={onToggle} data-testid={`payment-detail-select-${o.id}`} />
        {isEligible(o) || selected ? "Include in payment selection" : "Not eligible for payment"}
      </label>
      {o.canRemove === true
        ? <button type="button" disabled={locked || removing} onClick={() => onRemove(o)} className="pap-btn" style={{ color: "#A12924", borderColor: "#D7A3A0" }} data-testid={`payment-remove-${o.id}`}><Trash2 className="h-3.5 w-3.5" />{o.requiresRemovalOverride ? "Remove (Admin override)" : "Remove supplier submission"}</button>
        : <button type="button" disabled title={o.removalReason ?? undefined} className="max-w-full cursor-not-allowed text-left text-xs break-words" style={{ color: "#8A5A00" }} data-testid={`payment-remove-${o.id}`}>{o.removalReason || (o.canRemove === false ? "Removal unavailable" : "Refresh to check removal permission")}</button>}
    </div>}>
    <Notice message={message} />
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      <span style={{ color: "var(--t-subtle)" }}>Supplier payment</span><SupplierBadge state={st} />
      <span className="ml-2" style={{ color: "var(--t-subtle)" }}>Fulfilment</span><FulfilmentText status={o.status} />
      <span className="ml-2" style={{ color: "var(--t-subtle)" }}>Customer payment status is not changed here.</span>
    </div>
    {(o.stale || o.reviewReason) && <div className="mb-4 rounded-lg border-l-4 p-3 text-xs" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))" }}>
      {o.stale && <p className="font-semibold">Stale submission · awaiting resubmission</p>}
      {o.reviewReason && <p>{o.reviewReason}</p>}
    </div>}
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {stat("Supplier cost", moneyOf(o.totalCost), "var(--t-blue-deep)")}
      {stat("Sold price · products only", moneyOf(p?.salesUsd))}
      {stat("Est. product profit", signedMoneyOf(p?.amountUsd), !p?.amountUsd ? "#B4770E" : p.amountUsd.startsWith("-") ? "#B42318" : "#15803D")}
    </div>
    {removing && removeTarget && <section className="mb-4 space-y-3 rounded-lg border p-4" style={{ borderColor: "#D7A3A0", background: "color-mix(in srgb, #B42318 4%, var(--t-surface))" }} data-testid="payment-remove-confirmation" aria-label="Confirm supplier submission removal">
      <p className="text-sm font-bold">Remove supplier submission · <span className="font-mono">{removeTarget.reference}</span></p>
      <p className="text-xs leading-relaxed">This removes the supplier submission from the vendor portal and payment list. It keeps the customer order and historical receipts. It does not cancel the customer order or reverse any transfer.</p>
      {removeTarget.requiresRemovalOverride && <>
        <p className="text-xs leading-relaxed font-semibold" style={{ color: "#8A5A00" }}>
          Admin override: vendor fulfilment has started or photos have been uploaded. Coordinate with the vendor first; removal does not stop a parcel already shipped. Customer fulfilment and tracking stay unchanged. The original submission and photo references are retained in the Admin audit history.
        </p>
        <label className="block text-xs font-semibold">Reason for Admin removal
          <textarea value={removeReason} onChange={(e) => onRemoveReason(e.target.value)} maxLength={2000} rows={3} disabled={removeBusy}
            className="mt-2 block w-full rounded-lg border p-3 text-sm" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}
            placeholder="Explain why this supplier submission should be removed." data-testid="payment-remove-reason" />
        </label>
      </>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={removeBusy || (removeTarget.requiresRemovalOverride === true && !removeReason.trim())} onClick={onRemoveConfirm} className="pap-btn pap-btn-danger" data-testid="payment-remove-confirm">{removeBusy ? "Removing…" : "Confirm removal"}</button>
        <button type="button" disabled={removeBusy} onClick={onRemoveCancel} className="pap-btn" data-testid="payment-remove-cancel">Cancel</button>
      </div>
    </section>}
    <OrderBreakdown src={o} testId={`payment-order-detail-${o.id}`} />
    {p && <div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)" }} data-testid={`payment-profit-detail-${o.id}`}>
      <p className="font-semibold">Estimated product profit · {signedMoneyOf(p.amountUsd)}</p>
      <p className="mt-1" style={{ color: "var(--t-subtle)" }}>Customer product sales: {moneyOf(p.salesUsd)} · Supplier product cost: {moneyOf(p.supplierProductsUsd)}</p>
      <p className="mt-1" style={{ color: "var(--t-subtle)" }}>{p.definition}</p>
      {p.reason && <p className="mt-1 font-medium" style={{ color: "#B4770E" }}>{p.reason}</p>}
    </div>}
    {!p && <p className="mt-4 text-xs" style={{ color: "#8A5A00" }}>Profit details unavailable; refresh the ledger.</p>}
  </Overlay>;
}
