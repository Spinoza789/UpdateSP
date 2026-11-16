import React, { useMemo, useState } from "react";
import { cents, money, type LedgerOrder } from "./model";
import { Notice, Overlay } from "./Overlay";
import { inputCls, inputStyle } from "../../reshipper-payouts/ui";

export type HistoricalPaidReviewProps = {
  orders: LedgerOrder[];
  vendorName: string;
  busy: boolean;
  message: { ok: boolean; text: string } | null;
  onConfirm: (note: string) => void;
  onClose: () => void;
};

export function HistoricalPaidReview({ orders, vendorName, busy, message, onConfirm, onClose }: HistoricalPaidReviewProps) {
  const [note, setNote] = useState("");
  const total = useMemo(() => {
    let sum = 0n;
    for (const order of orders) {
      const amount = cents(order.totalCost);
      if (amount === null) return null;
      sum += amount;
    }
    return sum;
  }, [orders]);
  const canConfirm = orders.length > 0 && total !== null && note.trim().length > 0 && !busy;

  return <Overlay
    title="Review processed orders as paid"
    subtitle={vendorName}
    side="center"
    onClose={onClose}
    canClose={!busy}
    closeTestId="historical-paid-close"
    testId="historical-paid-review"
    footer={<div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs tabular-nums" style={{ color: "var(--t-subtle)" }}>
        {orders.length} existing {orders.length === 1 ? "order" : "orders"} · {money(total)} submitted supplier amount
      </span>
      <div className="flex gap-2">
        <button type="button" className="pap-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="pap-btn pap-btn-primary" disabled={!canConfirm} onClick={() => onConfirm(note.trim())} data-testid="historical-paid-confirm">
          {busy ? "Recording…" : "Confirm these orders"}
        </button>
      </div>
    </div>}
  >
    <Notice message={message} />
    <div className="mb-4 rounded-lg border px-3 py-3 text-sm leading-relaxed" style={{ borderColor: "var(--t-border)", background: "var(--pap-soft)" }}>
      <p className="font-semibold">Historical acknowledgement only</p>
      <p className="mt-1" style={{ color: "var(--t-subtle)" }}>
        This records that these existing orders were already paid outside Peps Anonymous Payment. It makes no transfer, creates no TXID or receipt, does not auto-pay future orders, and does not change customer order statuses. The acknowledgement uses each order’s existing submitted supplier amount, including stale amounts.
      </p>
      <p className="mt-2 font-semibold">No buyer notifications are sent. This is an internal supplier-accounting update only.</p>
    </div>
    {orders.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>
      No eligible existing processed orders were supplied for review.
    </div> : <div className="max-h-[min(38vh,360px)] overflow-y-auto rounded-lg border" style={{ borderColor: "var(--t-border)" }}>
      <ul className="divide-y" style={{ borderColor: "var(--t-border)" }}>
        {orders.map((order) => <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5" data-testid={`historical-paid-order-${order.id}`}>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{order.reference}</p>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>{order.status} · submitted supplier amount{order.stale ? " · STALE" : ""}</p>
            {(order.sourceOrders ?? []).map(source => source.status && <p key={source.id} className="text-xs" style={{ color: "var(--t-subtle)" }}>
              Order {source.code ?? source.id}: {source.status}
            </p>)}
          </div>
          <strong className="text-sm tabular-nums">{money(cents(order.totalCost))}</strong>
        </li>)}
      </ul>
    </div>}
    <label className="mt-4 block text-xs font-semibold" style={{ color: "var(--t-subtle)" }}>Reason / evidence for this historical acknowledgement <span aria-hidden="true">*</span>
      <textarea className={inputCls + " mt-1 min-h-[82px]"} style={inputStyle} value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} disabled={busy}
        placeholder="For example: supplier confirmed the transfer on 14 May" data-testid="historical-paid-note" />
    </label>
    {!note.trim() && <p className="mt-2 text-xs" style={{ color: "#B4770E" }}>A note is required before confirming the listed orders.</p>}
  </Overlay>;
}
