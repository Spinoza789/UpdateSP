import React from "react";
import { money, type LedgerOrder } from "./model";
import { paymentSummary } from "./paymentSummary";

const signedMoney = (amount: bigint | null) =>
  amount !== null && amount < 0n ? `-${money(-amount)}` : money(amount);

export function PaymentSummary({ chosen, total }: { chosen: LedgerOrder[]; total: bigint }) {
  const summary = paymentSummary(chosen);
  const metrics = [
    { key: "products", label: "Supplier product costs", value: money(summary.productCost) },
    { key: "shipping", label: "Supplier shipping", value: money(summary.shipping) },
    { key: "total", label: "Total owed to supplier", value: chosen.length ? money(total) : "Unavailable" },
    { key: "sales", label: "Customer selling price · products", value: money(summary.sales) },
    { key: "profit", label: "Est. product profit", value: signedMoney(summary.profit) },
    { key: "margin", label: "Product margin", value: summary.margin ?? "Unavailable" },
  ];
  return <section aria-label="Selected orders payment summary" data-testid="payment-summary" className="mb-3 space-y-2">
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {metrics.map(metric => <div key={metric.key} data-testid={`payment-summary-${metric.key}`}
        className="min-w-0 rounded-lg border px-2.5 py-2"
        style={{
          borderColor: metric.key === "total" ? "var(--t-blue, #1B3A7A)" : "var(--t-border)",
          background: metric.key === "total" ? "color-mix(in srgb, var(--t-blue, #1B3A7A) 8%, var(--t-surface))" : "var(--t-bg)",
        }}>
        <dt className="text-[10px] leading-tight" style={{ color: "var(--t-subtle)" }}>{metric.label}</dt>
        <dd className="mt-1 break-words text-sm font-bold tabular-nums" style={{
          color: metric.key === "total" ? "var(--t-blue, #1B3A7A)"
            : metric.key === "profit" && summary.profit !== null ? summary.profit < 0n ? "#B42318" : "#15803D" : "var(--t-text)",
        }}>{metric.value}</dd>
      </div>)}
    </dl>
    <p className="text-[10px] leading-snug" style={{ color: "var(--t-subtle)" }}>
      All totals in USD, not the crypto amount sent. Saved order prices only.
      {" "}Product profit excludes shipping, order-level discounts, credits, fees, tax and overheads; not net profit.
      {" "}Shipping is treated separately as a pass-through and does not change product profit or margin.
    </p>
    {summary.incomplete && <p data-testid="payment-summary-history-warning" className="text-[10px] leading-snug" style={{ color: "var(--t-text)" }}>
      Some historical values are unavailable. Missing values are not treated as zero; incomplete totals show Unavailable.
    </p>}
  </section>;
}
