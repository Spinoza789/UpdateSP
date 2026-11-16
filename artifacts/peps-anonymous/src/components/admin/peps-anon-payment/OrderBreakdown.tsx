import React from "react";
import { moneyOf, signedMoneyOf, fmtDate, type LineItem, type SourceOrder, type OrderProfit } from "./model";
import { formatPercent } from "./reportDates";
import { subtle } from "../../reshipper-payouts/ui";

export type BreakdownSource = {
  sourceType?: "order" | "shared";
  sourceId?: string;
  submittedAt?: string | null;
  sourceOrders?: SourceOrder[];
  items?: LineItem[];
  productCost?: string | null;
  shippingCost?: string | null;
  totalCost?: string | number | null;
  profit?: OrderProfit;
};

export function SourceRefs({ orders, shared }: { orders?: SourceOrder[]; shared: boolean }) {
  if (!orders?.length) return <p className="text-xs" style={subtle}>Original order references not provided.</p>;
  return <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-widest" style={subtle}>
      {shared ? `Constituent orders (${orders.length}) · references only, not separate charges` : "Original order"}
    </p>
    <ul className="flex flex-wrap gap-1.5">
      {orders.map((s) => <li key={s.id} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: "var(--t-border)" }}>
        <span className="font-mono font-semibold">{s.code ?? "Code not recorded"}</span>
        {s.username && <span className="ml-1.5" style={subtle}>{s.username}</span>}
      </li>)}
    </ul>
  </div>;
}

export function OrderBreakdown({ src, testId }: { src: BreakdownSource; testId?: string }) {
  const items = src.items ?? [];
  const showSales = !!src.profit;
  const lines = new Map((src.profit?.lines ?? []).map(line => [line.productName, line]));
  return <div className="space-y-3 text-xs" data-testid={testId}>
    <div className="flex flex-wrap gap-x-4 gap-y-1" style={subtle}>
      <span>Source: <strong style={{ color: "var(--t-text)" }}>{src.sourceType === "shared" ? "Shared order" : src.sourceType === "order" ? "Single order" : "Not recorded"}</strong></span>
      {src.sourceId && <span>Source ID: <span className="font-mono">{src.sourceId}</span></span>}
      <span>Submitted: {fmtDate(src.submittedAt, true)}</span>
    </div>
    <SourceRefs orders={src.sourceOrders} shared={src.sourceType === "shared"} />
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--t-border)" }}>
      <table className={`w-full ${showSales ? "min-w-[720px]" : "min-w-[420px]"} text-left tabular-nums`}>
        <thead style={{ background: "var(--t-bg)", color: "var(--t-subtle)" }}><tr>
          <th className="p-2">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Supplier unit cost</th><th className="p-2 text-right">Supplier line total</th>
          {showSales && <><th className="p-2 text-right">Sold price (total)</th><th className="p-2 text-right">Product profit</th></>}
        </tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={showSales ? 6 : 4} className="p-2" style={subtle}>Line items unavailable for this submission.</td></tr>}
          {items.map((it, i) => {
            const sale = src.profit?.reason ? undefined : lines.get(it.productName);
            return <tr key={i} className="border-t" style={{ borderColor: "var(--t-border)" }}>
            <td className="p-2">{it.productName}</td><td className="p-2 text-right">{it.quantity ?? "Unavailable"}</td>
            <td className="p-2 text-right">{moneyOf(it.unitCost)}</td><td className="p-2 text-right font-semibold">{moneyOf(it.lineTotal)}</td>
            {showSales && <>
              <td className="p-2 text-right">{moneyOf(sale?.salesUsd)}</td>
              <td className="p-2 text-right font-semibold" style={{ color: sale ? (sale.amountUsd.startsWith("-") ? "var(--t-red, #b42318)" : "var(--t-green, #16805d)") : "var(--t-subtle)" }}>{signedMoneyOf(sale?.amountUsd)}</td>
            </>}
          </tr>; })}
        </tbody>
        <tfoot className="border-t" style={{ borderColor: "var(--t-border)" }}>
          <tr><td colSpan={3} className="p-2 text-right" style={subtle}>Product subtotal</td><td className="p-2 text-right">{moneyOf(src.productCost)}</td>
            {showSales && <><td className="p-2 text-right font-semibold">{moneyOf(src.profit?.salesUsd)}</td><td className="p-2 text-right font-semibold">{signedMoneyOf(src.profit?.amountUsd)}</td></>}
          </tr>
          {showSales && <tr data-testid="breakdown-margin"><td colSpan={5} className="p-2 text-right" style={subtle}>Margin on product sales</td>
            <td className="p-2 text-right font-semibold" style={{ color: src.profit?.marginPercent == null ? "#B4770E" : "var(--t-text)" }}>{formatPercent(src.profit?.marginPercent)}</td></tr>}
          <tr><td colSpan={3} className="p-2 text-right" style={subtle}>Supplier shipping</td><td className="p-2 text-right">{moneyOf(src.shippingCost)}</td>{showSales && <td colSpan={2} />}</tr>
          <tr><td colSpan={3} className="p-2 text-right font-bold">Supplier cost total (USD)</td><td className="p-2 text-right font-bold" style={{ color: "var(--t-blue-deep)" }}>{moneyOf(src.totalCost)}</td>{showSales && <td colSpan={2} />}</tr>
        </tfoot>
      </table>
    </div>
    <p className="text-[11px]" style={subtle}>{showSales
      ? "USD · Sold prices are product line totals. Estimated product profit is sales minus submitted supplier product costs, before shipping, discounts, credits and fees; not net profit. Unmatched or stale sales are shown as unavailable."
      : "Submitted supplier-cost snapshot. Customer prices and margins are not shown."}</p>
  </div>;
}
