import React, { useState } from "react";
import { OrderBreakdown } from "./OrderBreakdown";
import { Overlay, Notice } from "./Overlay";
import { WalletList } from "./WalletList";
import { PaymentSummary } from "./PaymentSummary";
import { money, moneyOf, type LedgerOrder, type Wallet } from "./model";
import { inputCls, inputStyle } from "../../reshipper-payouts/ui";

export type PaymentForm = { walletId: string; amount: string; txid: string; paidAt: string; note: string };
export type Draft = {
  vendorId: string;
  walletId: string;
  walletSnapshot: { currency: string; network: string; address: string };
  submissionIds: string[];
  orderSnapshots: { submissionId: string; reviewToken: string }[];
  txid: string;
  cryptoAmount: string;
  paidAt?: string;
  note?: string;
};

export function RecordPaymentPanel({ wallets, form, onForm, chosen, total, draft, busy, ready, dateError, tokenProblem, onReview, onConfirm, onEdit, onClose, onDiscard, canClose, message, onCopy, vendorName }: {
  wallets: Wallet[]; form: PaymentForm; onForm: (patch: Partial<PaymentForm>) => void;
  chosen: LedgerOrder[]; total: bigint; draft: Draft | null; busy: boolean; ready: boolean; dateError: boolean; tokenProblem: number;
  onReview: () => void; onConfirm: () => void; onEdit: () => void; onClose: () => void; onDiscard: () => void; canClose: boolean;
  message: { ok: boolean; text: string } | null; onCopy: (a: string) => void; vendorName: string;
}) {
  const [discarding, setDiscarding] = useState(false);
  const lbl = "block text-xs font-medium";
  const sub = { color: "var(--t-subtle)" };
  return <Overlay side="center" testId="payment-record-dialog" closeTestId="payment-record-close" canClose={canClose} onClose={onClose}
    title={draft ? "Confirm payment record" : "Record payment"}
    subtitle={<>Records an external transfer already sent to {vendorName}. It never sends funds or verifies blockchain receipt.</>}
    footer={<>
      <PaymentSummary chosen={chosen} total={total} />
      {draft
      ? <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" data-testid="payment-edit" disabled={busy} className="pap-btn" onClick={onEdit}>Edit</button>
          <button type="button" data-testid="payment-confirm" disabled={busy} className="pap-btn pap-btn-primary" onClick={onConfirm}>{busy ? "Recording" : "Confirm record"}</button>
        </div>
      : <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs" style={sub}>{chosen.length} {chosen.length === 1 ? "order" : "orders"} · <strong className="tabular-nums" style={{ color: "var(--t-text)" }}>{money(total)}</strong> USD supplier cost</span>
          <button type="button" data-testid="payment-review" disabled={!ready} className="pap-btn pap-btn-primary" onClick={onReview}>Review payment record</button>
        </div>}
    </>}>
    <section aria-label="Record external transfer" className="space-y-4">
      <Notice message={message} />
      {discarding ? <div role="alert" className="space-y-2 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--t-border)" }}>
        <p>Discard this unsaved payment record? No transfer or saved receipt will be changed.</p>
        <div className="flex gap-2">
          <button type="button" className="pap-btn" onClick={() => setDiscarding(false)} data-testid="payment-record-discard-cancel">Keep editing</button>
          <button type="button" className="pap-btn pap-btn-danger" disabled={busy} onClick={onDiscard} data-testid="payment-record-discard-confirm">Discard record</button>
        </div>
      </div> : <button type="button" className="pap-btn" disabled={busy} onClick={() => setDiscarding(true)} data-testid="payment-record-discard">Discard unsaved record</button>}
      {!draft && <>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={sub}>Vendor receiving wallets</p>
          <WalletList wallets={wallets} activeId={form.walletId} onCopy={onCopy} />
        </div>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
          <label className={lbl + " sm:col-span-2"} style={sub}>Destination wallet (vendor saved)
            <select className={inputCls} style={inputStyle} data-testid="payment-wallet" value={form.walletId} onChange={(e) => onForm({ walletId: e.target.value })}>
              <option value="">Select wallet</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.label ? `${w.label} · ` : ""}{w.currency} / {w.network} · {w.address}</option>)}
            </select>
          </label>
          <label className={lbl} style={sub}>Actual crypto amount sent
            <input data-testid="payment-amount" className={inputCls + " tabular-nums"} style={inputStyle} inputMode="decimal" value={form.amount} onChange={(e) => onForm({ amount: e.target.value })} />
          </label>
          <label className={lbl} style={sub}>Transaction ID (TXID)
            <input data-testid="payment-txid" className={inputCls + " font-mono"} style={inputStyle} value={form.txid} onChange={(e) => onForm({ txid: e.target.value })} />
          </label>
          <label className={lbl} style={sub}>Payment date (optional, local time)
            <input data-testid="payment-date" type="datetime-local" className={inputCls} style={inputStyle} value={form.paidAt} onChange={(e) => onForm({ paidAt: e.target.value })} />
            {dateError && <span role="alert" className="mt-1 block" style={{ color: "#B42318" }}>Enter a valid payment date.</span>}
          </label>
          <label className={lbl} style={sub}>Note (optional)
            <input data-testid="payment-note" className={inputCls} style={inputStyle} value={form.note} onChange={(e) => onForm({ note: e.target.value })} />
          </label>
          {tokenProblem > 0 && <p role="alert" className="sm:col-span-2 rounded-lg border-l-4 p-3 text-xs" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))", color: "var(--t-text)" }} data-testid="payment-token-warning">
            {tokenProblem} chosen {tokenProblem === 1 ? "order is" : "orders are"} missing a valid cost-snapshot token. Refresh payments & wallets, then reselect before reviewing.
          </p>}
        </fieldset>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={sub}>Orders in this payment ({chosen.length})</p>
          <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-xs tabular-nums" style={{ borderColor: "var(--t-border)" }}>
            {chosen.map((o) => <li key={o.id} className="flex justify-between gap-2 px-3 py-1.5" style={{ borderColor: "var(--t-border)" }}><span className="font-mono break-all">{o.reference}{o.sourceType === "shared" ? " (shared)" : ""}</span><span className="font-semibold">{moneyOf(o.totalCost)}</span></li>)}
            {chosen.length === 0 && <li className="px-3 py-2" style={sub}>No eligible orders selected. Close and select orders in the To pay tab.</li>}
          </ul>
        </div>
      </>}
      {draft && <div className="space-y-3 text-sm" data-testid="payment-draft">
        <p className="font-bold">Confirm receipt for {draft.submissionIds.length} {draft.submissionIds.length === 1 ? "order" : "orders"} · {money(total)} USD supplier cost</p>
        <dl className="grid gap-x-4 gap-y-1.5 rounded-lg border p-3 text-xs sm:grid-cols-[140px_1fr]" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)" }}>
          <dt style={sub}>Amount sent</dt><dd className="font-semibold tabular-nums">{draft.cryptoAmount} {draft.walletSnapshot.currency} / {draft.walletSnapshot.network}</dd>
          <dt style={sub}>Address</dt><dd className="font-mono break-all">{draft.walletSnapshot.address}</dd>
          <dt style={sub}>TXID</dt><dd className="font-mono break-all">{draft.txid}</dd>
          {draft.paidAt && <><dt style={sub}>Paid</dt><dd>{new Date(draft.paidAt).toLocaleString()}</dd></>}
          {draft.note && <><dt style={sub}>Note</dt><dd>{draft.note}</dd></>}
        </dl>
        <ul className="max-h-[22rem] divide-y overflow-y-auto rounded-lg border text-xs tabular-nums" style={{ borderColor: "var(--t-border)" }}>
          {chosen.map((o) => <li key={o.id} className="p-2" style={{ borderColor: "var(--t-border)" }}>
            <details data-testid={`payment-draft-item-${o.id}`}>
              <summary className="flex cursor-pointer justify-between gap-2" data-testid={`payment-draft-expand-${o.id}`}>
                <span className="font-mono break-all">{o.reference}{o.sourceType === "shared" ? " (shared)" : ""}</span><span className="font-semibold">{moneyOf(o.totalCost)}</span>
              </summary>
              <div className="mt-2"><OrderBreakdown src={o} testId={`payment-draft-detail-${o.id}`} /></div>
            </details>
          </li>)}
        </ul>
        <p className="text-[11px]" style={sub}>This records funds you already sent. It does not send money, verify the blockchain, mark customer payments received or mark orders shipped.</p>
      </div>}
    </section>
  </Overlay>;
}
