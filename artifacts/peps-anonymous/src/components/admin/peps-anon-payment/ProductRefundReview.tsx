import { useState } from "react";
import { moneyOf } from "./model";
import { inputCls, inputStyle } from "../../reshipper-payouts/ui";

export type RefundRequest = (path: string, init?: RequestInit) => Promise<any>;
export type RefundToReview = { refundId: string; orderId: string; amountUsd: string };
type Options = RefundToReview & { reviewed: boolean; submissions: Array<{
  id: string; reference: string; vendorId: string; reason: string | null;
  lines: Array<{ productName: string; quantity: number; salesUsd: string }>;
}> };
type Draft = { submissionId: string; productName: string; quantity: string; salesUsd: string };

/** Reuses the report's Admin-authenticated request; never exposed to vendors. */
export function ProductRefundReview({ refunds, request, onSaved }: {
  refunds: RefundToReview[]; request: RefundRequest; onSaved: () => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<{ reviewToken: string; review: { productRefundUsd: string; nonProductRefundUsd: string } } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const open = async (id: string) => {
    setBusy(true); setError(""); setOptions(null); setPreview(null); setDraft([]); setNote("");
    try {
      const value: Options = await request(`/api/admin/vendor-payments/product-refunds/${encodeURIComponent(id)}`);
      setOptions(value);
      setDraft(value.submissions.flatMap(s => s.lines.map(line => ({
        submissionId: s.id, productName: line.productName, quantity: "", salesUsd: "",
      }))));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load refund evidence."); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!options) return;
    setBusy(true); setError("");
    try {
      const allocations = draft.filter(d => d.quantity || d.salesUsd).map(d => ({
        ...d, quantity: Number(d.quantity), salesUsd: d.salesUsd,
      }));
      const value = await request(`/api/admin/vendor-payments/product-refunds/${encodeURIComponent(options.refundId)}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations, note, ...(preview ? { reviewToken: preview.reviewToken } : {}) }),
      });
      if (preview) {
        if (!value?.ok) throw new Error("The review was not saved. Refresh and try again.");
        setOptions(null); setPreview(null); onSaved();
      } else {
        if (typeof value?.reviewToken !== "string" || !value?.review) throw new Error("The review preview was incomplete.");
        setPreview(value);
      }
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Could not save the product review.");
    } finally { setBusy(false); }
  };
  if (!refunds.length) return null;
  const blocked = options?.reviewed || options?.submissions.some(s => s.reason || !s.lines.length);
  return <section className="space-y-3 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--t-border)" }} aria-label="Product refund reviews">
    <h3 className="font-semibold">Completed refunds awaiting product review</h3>
    <p>Review the product quantities and historical selling amounts for this member only, across every supplier. Exclude shipping, fees and other non-product refunds. Supplier costs remain unchanged. A saved review is permanent.</p>
    <div className="flex flex-wrap gap-2">{refunds.map(r => <button type="button" key={r.refundId} disabled={busy}
      data-testid={`review-product-refund-${r.refundId}`} className="rounded-lg border px-3 py-2"
      onClick={() => void open(r.refundId)}>Review {r.orderId} · {moneyOf(r.amountUsd)}</button>)}</div>
    {error && <p role="alert" data-testid="product-refund-error" style={{ color: "var(--t-error, #B42318)" }}>{error}</p>}
    {options && <div className="space-y-3" data-testid="product-refund-editor">
      <p className="font-semibold">Whole refund: {moneyOf(options.amountUsd)} · Order {options.orderId}</p>
      {options.reviewed && <p>This refund has already been reviewed. Refresh the report.</p>}
      {options.submissions.map(s => <div key={s.id} className="space-y-2 rounded-lg border p-2" style={{ borderColor: "var(--t-border)" }}>
        <p className="font-semibold">{s.reference} · Supplier {s.vendorId}</p>
        {s.reason && <p role="status">{s.reason}</p>}
        {s.lines.map(line => {
          const index = draft.findIndex(d => d.submissionId === s.id && d.productName === line.productName);
          return <div key={line.productName} className="grid gap-2 sm:grid-cols-3">
            <span>{line.productName} · Original {line.quantity} · {moneyOf(line.salesUsd)}</span>
            {(["quantity", "salesUsd"] as const).map(field => <label key={field} className="space-y-1">
              <span>{field === "quantity" ? "Refunded quantity" : "Product refund USD"}</span>
              <input type="number" min="0" step="0.01" disabled={busy || !!preview || !!blocked}
                data-testid={`refund-${field}-${index}`} className={inputCls} style={inputStyle}
                value={draft[index]?.[field] ?? ""} placeholder="Leave blank if unaffected"
                onChange={e => setDraft(current => current.map((d, i) => i === index ? { ...d, [field]: e.target.value } : d))} />
            </label>)}
          </div>;
        })}
      </div>)}
      <label className="block space-y-1"><span>Review note and product attribution evidence</span>
        <textarea data-testid="product-refund-note" className={inputCls} style={inputStyle} maxLength={2000}
          value={note} disabled={busy || !!preview || !!blocked} onChange={e => setNote(e.target.value)} /></label>
      <p>Leave all product fields blank only after verifying this was a shipping/fee-only refund.</p>
      {preview && <p role="status" data-testid="product-refund-preview">
        Product sales reduction: {moneyOf(preview.review.productRefundUsd)}. Shipping/fees/other excluded from profit adjustment: {moneyOf(preview.review.nonProductRefundUsd)}.
        Confirm that all suppliers and products for this member have been reviewed.
      </p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid={preview ? "confirm-product-refund" : "preview-product-refund"}
          className="rounded-xl px-3 py-2 text-white" style={{ background: "var(--t-blue-deep)" }}
          disabled={busy || !!blocked || !note.trim()} onClick={() => void submit()}>
          {busy ? "Saving…" : preview ? "Confirm permanent product review" : "Preview product adjustment"}
        </button>
        {preview && <button type="button" disabled={busy} data-testid="edit-product-refund" onClick={() => setPreview(null)}>Edit review</button>}
        <button type="button" disabled={busy} data-testid="close-product-refund" onClick={() => setOptions(null)}>Close</button>
      </div>
    </div>}
  </section>;
}
