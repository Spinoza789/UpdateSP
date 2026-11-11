import React from "react";
import { STATE_LABEL, STATE_TONE, type PaymentState } from "./model";

export const TAB_LABEL: Record<PaymentState, string> = { owed: "To pay", paid: "Paid", needs_review: "Needs review", not_owed: "Not owed" };

export function SupplierBadge({ state }: { state: PaymentState }) {
  const tone = STATE_TONE[state];
  return <span className="pap-badge" title={"Supplier payment: " + STATE_LABEL[state]} style={{ color: state === "owed" ? "var(--t-blue-deep)" : tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
    <span className="sr-only">Supplier payment: </span>{STATE_LABEL[state]}
  </span>;
}

export function FulfilmentText({ status }: { status: string }) {
  return <span className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap" style={{ borderColor: "var(--t-border)", color: "var(--t-muted)" }}>
    <span className="sr-only">Fulfilment: </span>{status}
  </span>;
}
