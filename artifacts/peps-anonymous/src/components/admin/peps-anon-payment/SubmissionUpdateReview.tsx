import React from "react";
import { OrderBreakdown, type BreakdownSource } from "./OrderBreakdown";

type ReviewedShipment = BreakdownSource & {
  shipping?: { name?: string; address?: string; country?: string; phone?: string; email?: string };
};
export type SubmissionUpdatePreview = {
  id: string;
  previewToken: string;
  before: ReviewedShipment;
  after: ReviewedShipment;
};

export function SubmissionUpdateReview({ preview, busy, onConfirm, onCancel }: {
  preview: SubmissionUpdatePreview; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return <section className="mb-4 space-y-4 rounded-xl border p-4" style={{ borderColor: "var(--t-blue)", background: "var(--t-bg)" }}
    data-testid="payment-update-preview" aria-label="Review updated supplier submission">
    <div>
      <h3 className="font-semibold">Review updated submission</h3>
      <p className="mt-1 text-xs">Check the items, delivery details and recalculated supplier prices below. Confirming replaces the vendor’s submitted copy. The original remains in audit history; no funds are sent and the customer order and payment receipts are not changed.</p>
    </div>
    {([["Previously submitted", preview.before], ["Updated order · proposed submission", preview.after]] as const).map(([title, shipment]) =>
      <div key={title} className="space-y-2 rounded-lg border p-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        <h4 className="text-sm font-semibold">{title}</h4>
        <OrderBreakdown src={shipment} />
        <p className="whitespace-pre-wrap break-words text-xs">
          <strong>Delivery: </strong>{Object.values(shipment.shipping ?? {}).filter(Boolean).join(" · ") || "Not recorded"}
        </p>
      </div>)}
    <div className="flex flex-wrap gap-2">
      <button type="button" className="pap-btn pap-btn-primary" disabled={busy} onClick={onConfirm} data-testid="payment-update-confirm">{busy ? "Updating…" : "Confirm updated submission"}</button>
      <button type="button" className="pap-btn" disabled={busy} onClick={onCancel} data-testid="payment-update-cancel">Cancel</button>
    </div>
  </section>;
}
