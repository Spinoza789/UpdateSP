import React from "react";
import { cents, money, type Summary } from "./model";

export function LedgerSummary({ summary }: { summary: Summary }) {
  const cells: [string, string, number, string, string][] = [
    ["To pay", summary.owed.amount, summary.owed.count, "var(--t-blue-deep)", "summary-owed"],
    ["Paid (active receipts)", summary.paid.amount, summary.paid.count, "#15803D", "summary-paid"],
    ["Needs review / on hold", summary.needsReview.amount, summary.needsReview.count, "#B4770E", "summary-review"],
    ["Not owed", summary.notOwed.amount, summary.notOwed.count, "var(--t-subtle)", "summary-not-owed"],
  ];
  return <div className="space-y-2">
    <dl className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-xl border" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }} aria-label="Whole vendor ledger totals">
      {cells.map(([label, amount, count, tone, id], i) => <div key={id} className={"min-w-0 px-4 py-3 " + (i ? "lg:border-l " : "") + (i % 2 ? "border-l " : "") + (i > 1 ? "border-t lg:border-t-0" : "")} style={{ borderColor: "var(--t-border)" }} data-testid={`payment-${id}`}>
        <dt className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--t-subtle)" }}><span className="h-2 w-2 rounded-full" style={{ background: tone }} />{label}</dt>
        <dd className="mt-0.5 text-lg font-bold tabular-nums break-words" style={{ color: "var(--t-text)" }}>{money(cents(amount))}</dd>
        <dd className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{count} {count === 1 ? "order" : "orders"} · USD</dd>
      </div>)}
    </dl>
    {summary.unavailableCount > 0 && <p role="status" className="rounded-lg border-l-4 px-3 py-2 text-xs" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))" }} data-testid="payment-summary-unavailable">
      {summary.unavailableCount} {summary.unavailableCount === 1 ? "order has" : "orders have"} an unavailable supplier cost. They are excluded from the amounts above and cannot be paid until corrected.
    </p>}
    <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Totals cover this vendor's whole ledger, not just the page shown. Supplier cost only; stale and on-hold shipments are never counted as owed.</p>
  </div>;
}
