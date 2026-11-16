import React, { useMemo, useState } from "react";
import { cents, money, type LedgerOrder } from "./model";
import { Notice, Overlay } from "./Overlay";
import { inputCls, inputStyle } from "../../reshipper-payouts/ui";

type SaveInput = { items: { productName: string; unitCost: string }[]; shippingCost: string; note: string };
type Props = {
  order: LedgerOrder;
  busy: boolean;
  message: { ok: boolean; text: string } | null;
  onSave: (input: SaveInput) => void;
  onClose: () => void;
};

const validAmount = (value: string) => /^(0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(value.trim());
const quantityHundredths = (value: number | null) => value === null || !Number.isFinite(value) ? null : BigInt(Math.round(value * 100));

export function SupplierCostEditor({ order, busy, message, onSave, onClose }: Props) {
  const items = order.items ?? [];
  const [unitCosts, setUnitCosts] = useState(() => items.map((item) => item.unitCost ?? ""));
  const [shippingCost, setShippingCost] = useState(order.shippingCost ?? "");
  const [note, setNote] = useState("");
  const paid = !!order.paymentId || order.paymentState === "paid" || !!order.paymentAcknowledgement;
  const lineAmounts = useMemo(() => items.map((item, i) => {
    const unit = cents(unitCosts[i]);
    const quantity = quantityHundredths(item.quantity);
    if (unit === null || quantity === null || quantity < 0n) return null;
    return (unit * quantity + 50n) / 100n;
  }), [items, unitCosts]);
  const productTotal = lineAmounts.every((amount) => amount !== null)
    ? lineAmounts.reduce<bigint>((total, amount) => total + (amount ?? 0n), 0n)
    : null;
  const shipping = cents(shippingCost);
  const total = productTotal !== null && shipping !== null ? productTotal + shipping : null;
  const valid = items.length > 0 && lineAmounts.every(v => v !== null) && unitCosts.every(validAmount) && validAmount(shippingCost) && note.trim().length > 0;

  const field = (label: string, value: string, change: (next: string) => void, testId: string) => <label className="block text-xs font-semibold" style={{ color: "var(--t-subtle)" }}>
    {label}
    <span className="relative mt-1 block">
      <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--t-subtle)" }}>$</span>
      <input type="text" inputMode="decimal" autoComplete="off" className={inputCls + " !min-h-[36px] pl-7"} style={inputStyle} value={value}
        onChange={(event) => change(event.target.value)} disabled={busy} data-testid={testId} aria-label={label} />
    </span>
  </label>;

  return <Overlay
    title="Edit supplier costs"
    subtitle={`${order.reference} · Supplier-only amounts in USD`}
    side="center"
    onClose={onClose}
    canClose={!busy}
    closeTestId="supplier-cost-close"
    testId="supplier-cost-editor"
    footer={<div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" className="pap-btn" disabled={busy} onClick={onClose}>Cancel</button>
      <button type="button" className="pap-btn pap-btn-primary" disabled={busy || paid || !valid} onClick={() => onSave({
        items: items.map((item, i) => ({ productName: item.productName, unitCost: unitCosts[i].trim() })),
        shippingCost: shippingCost.trim(), note: note.trim(),
      })} data-testid="supplier-cost-save">{busy ? "Saving…" : "Save supplier costs"}</button>
    </div>}
  >
    <Notice message={message} />
    <p className="mb-4 rounded-lg border px-3 py-2 text-xs leading-relaxed" style={{ borderColor: "var(--t-border)", background: "var(--pap-soft)", color: "var(--t-subtle)" }}>
      These fields change the supplier’s unit costs and shipping only. Customer prices and order totals are not editable here.
    </p>
    {paid && <p role="alert" className="mb-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(180,35,24,.35)", background: "rgba(239,68,68,.07)", color: "#B42318" }}>
      This submission has a recorded payment. Clear the paid acknowledgement or void its receipt before editing supplier costs.
    </p>}
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--t-border)" }}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead><tr className="text-[11px]" style={{ background: "var(--pap-soft)", color: "var(--t-subtle)" }}>
          <th className="px-3 py-2">Order item</th><th className="px-3 py-2 text-right">Qty · fixed</th><th className="w-40 px-3 py-2">Supplier unit cost</th><th className="px-3 py-2 text-right">Line total</th>
        </tr></thead>
        <tbody>
          {items.length ? items.map((item, index) => <tr key={`${item.productName}-${index}`} className="border-t" style={{ borderColor: "var(--t-border)" }}>
            <td className="px-3 py-3 font-medium">{item.productName}</td>
            <td className="px-3 py-3 text-right tabular-nums" style={{ color: "var(--t-subtle)" }}>{item.quantity ?? "Unavailable"}</td>
            <td className="px-3 py-2">{field(`${item.productName} unit cost`, unitCosts[index], (value) => setUnitCosts((current) => current.map((v, i) => i === index ? value : v)), `supplier-cost-unit-${index}`)}</td>
            <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(lineAmounts[index])}</td>
          </tr>) : <tr><td colSpan={4} className="px-3 py-5 text-center text-sm" style={{ color: "var(--t-subtle)" }}>No item lines were recorded for this submission.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)] sm:items-end">
      {field("Supplier shipping cost", shippingCost, setShippingCost, "supplier-cost-shipping")}
      <div className="rounded-lg px-3 py-2 text-right" style={{ background: "var(--t-blue-03)" }}>
        <span className="block text-[11px]" style={{ color: "var(--t-subtle)" }}>Supplier total · products + shipping</span>
        <strong className="text-lg tabular-nums">{money(total)}</strong>
      </div>
    </div>
    <label className="mt-4 block text-xs font-semibold" style={{ color: "var(--t-subtle)" }}>Reason for this supplier-cost adjustment <span aria-hidden="true">*</span>
      <textarea className={inputCls + " mt-1 min-h-[76px]"} style={inputStyle} value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} disabled={busy}
        placeholder="Record why the submitted supplier amount is changing" data-testid="supplier-cost-note" />
    </label>
    {(!valid && !paid) && <p className="mt-2 text-xs" style={{ color: "#B4770E" }}>Enter non-negative USD amounts with at most two decimals and a note to save.</p>}
  </Overlay>;
}
