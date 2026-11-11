import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { fmtDate, moneyOf, paginate, type Receipt } from "./model";
import { OrderBreakdown } from "./OrderBreakdown";
import { Pager } from "./LedgerOrders";
import { Overlay, Notice } from "./Overlay";
import { inputCls, inputStyle } from "../../reshipper-payouts/ui";

export function ReceiptHistory({ payments, openId, onOpen }: { payments: Receipt[]; openId: string | null; onOpen: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const view = paginate(payments, page);
  return <section aria-label="Payment history" className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
    <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--t-border)" }}>
      <p className="text-sm font-semibold">Receipts <span className="pap-count">{payments.length}</span></p>
      <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Frozen snapshots · external transfers, not blockchain verified</p>
    </div>
    {payments.length === 0
      ? <p className="m-3 rounded-lg border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>No payment records for this vendor yet.</p>
      : <div className="relative overflow-x-auto"><table className="pap-table">
        <thead><tr><th>Paid</th><th>Status</th><th className="pap-num">Amount sent</th><th className="pap-num">USD allocated</th><th>Orders</th><th>TXID</th><th className="w-8"><span className="sr-only">Open</span></th></tr></thead>
        <tbody>{view.rows.map((p) => <tr key={p.id} onClick={() => onOpen(p.id)} aria-current={openId === p.id ? "true" : undefined} data-testid={`payment-receipt-row-${p.id}`}>
          <td className="pap-c-ref whitespace-nowrap text-[12.5px]"><button type="button" className="text-left hover:underline" aria-label={`Open receipt ${p.txid}`} onClick={(e) => { e.stopPropagation(); onOpen(p.id); }} data-testid={`payment-receipt-expand-${p.id}`}>{fmtDate(p.paidAt)}</button></td>
          <td><span className="pap-badge" style={{ color: p.voidedAt ? "#B42318" : "#15803D", background: p.voidedAt ? "rgba(180,35,24,.1)" : "rgba(21,128,61,.1)" }}>{p.voidedAt ? "Voided" : "Recorded"}</span></td>
          <td className={"pap-num font-semibold " + (p.voidedAt ? "line-through opacity-70" : "")}><span className="pap-ml">Amount sent</span>{p.cryptoAmount} {p.currency}</td>
          <td className="pap-num"><span className="pap-ml">USD allocated</span>{moneyOf(p.usdAmount)}</td>
          <td className="text-[12.5px]"><span className="pap-ml">Orders</span>{p.orders.length}</td>
          <td className="pap-c-wide"><span className="pap-ml">TXID</span><span className="block max-w-[180px] truncate font-mono text-[12px]" title={p.txid}>{p.txid}</span></td>
          <td className="pap-c-go"><ChevronRight className="h-4 w-4" aria-hidden="true" /></td>
        </tr>)}</tbody>
      </table></div>}
    <div className="border-t px-3 py-2" style={{ borderColor: "var(--t-border)" }}><Pager page={view.page} pages={view.pages} onPage={setPage} prefix="payment-history" /></div>
  </section>;
}

export function ReceiptDrawer({ p, onClose, busy, locked, voiding, onVoidStart, onVoidCancel, reason, onReason, onVoidConfirm, message }: {
  p: Receipt; onClose: () => void; busy: boolean; locked: boolean; voiding: boolean; onVoidStart: () => void; onVoidCancel: () => void;
  reason: string; onReason: (r: string) => void; onVoidConfirm: () => void; message: { ok: boolean; text: string } | null;
}) {
  const sub = { color: "var(--t-subtle)" };
  return <Overlay testId={`payment-receipt-${p.id}`} closeTestId="payment-detail-close" canClose={!busy} onClose={onClose}
    title={<span className={p.voidedAt ? "line-through" : ""}>{p.cryptoAmount} {p.currency} · {moneyOf(p.usdAmount)} USD allocated</span>}
    subtitle={p.voidedAt ? "Voided · allocations released" : "Recorded by Admin · external transfer, not blockchain verified"}
    footer={!p.voidedAt ? (voiding
      ? <div className="space-y-2 text-sm">
          <p>Only corrects this record; does not reverse transfer. Its order allocations are released under existing rules.</p>
          <label className="block text-xs" style={sub}>Required reason (audited)
            <input data-testid="payment-void-reason" className={inputCls} style={inputStyle} value={reason} disabled={busy} onChange={(e) => onReason(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button type="button" data-testid="payment-void-confirm" disabled={busy || !reason.trim()} className="pap-btn pap-btn-danger" onClick={onVoidConfirm}>Confirm void record</button>
            <button type="button" disabled={busy} className="pap-btn" onClick={onVoidCancel} data-testid="payment-void-cancel">Cancel</button>
          </div>
        </div>
      : <div className="flex justify-end"><button type="button" disabled={locked} className="pap-btn" style={{ color: "#B42318" }} onClick={onVoidStart} data-testid="payment-void-open">Void record</button></div>) : undefined}>
    <Notice message={message} />
    <dl className="grid gap-x-4 gap-y-1.5 rounded-lg border p-3 text-xs sm:grid-cols-[150px_1fr]" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)" }}>
      <dt style={sub}>Destination (at recording)</dt><dd>{p.walletSnapshot.label ? `${p.walletSnapshot.label} · ` : ""}{p.walletSnapshot.currency} / {p.walletSnapshot.network}<code className="mt-0.5 block break-all select-all">{p.walletSnapshot.address}</code></dd>
      <dt style={sub}>TXID</dt><dd className="font-mono break-all select-all">{p.txid}</dd>
      <dt style={sub}>Paid</dt><dd>{fmtDate(p.paidAt, true)}</dd>
      <dt style={sub}>Recorded</dt><dd>{fmtDate(p.recordedAt, true)} by {p.recordedBy}</dd>
      {p.note && <><dt style={sub}>Note</dt><dd>{p.note}</dd></>}
      {p.voidedAt && <><dt style={{ color: "#B42318" }}>Voided</dt><dd style={{ color: "#B42318" }}>{fmtDate(p.voidedAt, true)}: {p.voidReason}</dd></>}
    </dl>
    <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest" style={sub}>Orders covered by this payment ({p.orders.length})</p>
    <ul className="space-y-2">
      {p.orders.map((o) => <li key={o.submissionId} className="rounded-lg border p-3" style={{ borderColor: "var(--t-border)" }}>
        <p className="flex justify-between gap-2 text-xs"><span className="font-mono font-semibold break-all">{o.reference}</span><span className="tabular-nums font-semibold">{moneyOf(o.amountUsd)} allocated</span></p>
        {o.detail
          ? <div className="mt-2"><OrderBreakdown src={o.detail} /></div>
          : <p className="mt-1 text-[11px]" style={{ color: "#B4770E" }}>Breakdown not recorded for this receipt. Only the allocated amount was saved at the time; current order data is not used to reconstruct it.</p>}
      </li>)}
    </ul>
  </Overlay>;
}
