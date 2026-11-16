import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { moneyOf, signedMoneyOf } from "./model";
import { formatPercent, londonToday, presetRange, PRESETS, reportPath, shiftRange, validRange, type Preset, type Range } from "./reportDates";
import { inputCls, inputStyle, Skeleton } from "../../reshipper-payouts/ui";
import { ProductRefundReview, type RefundRequest, type RefundToReview } from "./ProductRefundReview";

export type ReportSummary = {
  salesUsd: string; costUsd: string; profitUsd: string; marginPercent: string | null; matchedSalesUsd: string;
  totalCount: number; includedCount: number; excludedCount: number; unavailableCount: number; refundCount: number;
  refundExcludedCount?: number; productRefundUsd?: string;
};
export type ProfitReport = {
  currency: "USD"; timeZone: string; dateBasis: string; from: string; to: string;
  summary: ReportSummary;
  periods: Array<{ date: string } & ReportSummary>;
  issues: Array<{ id: string; reference: string; vendorId: string; reason: string }>;
  refundReviews?: RefundToReview[];
  adjustments?: Array<{ submissionId: string; reference: string; vendorId: string; affected: boolean; salesUsd: string; reason: string | null;
    reviews: Array<{ refundId: string; reviewedBy: string; reviewedAt: string; productRefundUsd: string; note: string }> }>;
};

export function isReport(v: unknown): v is ProfitReport {
  const r = v as Record<string, unknown> | null;
  const summary = (value: unknown) => {
    const s = value as Record<string, unknown> | null;
    return !!s && ["salesUsd", "costUsd", "profitUsd", "matchedSalesUsd"].every(k =>
      typeof s[k] === "string" && /^-?\d+\.\d{2}$/.test(s[k] as string))
      && (s.marginPercent === null || (typeof s.marginPercent === "string" && /^-?\d+(?:\.\d+)?$/.test(s.marginPercent)))
      && ["totalCount", "includedCount", "excludedCount", "unavailableCount", "refundCount"].every(k =>
        Number.isSafeInteger(s[k]) && Number(s[k]) >= 0);
  };
  return !!r && r.currency === "USD" && r.timeZone === "Europe/London" && r.dateBasis === "supplier_submission"
    && typeof r.from === "string" && typeof r.to === "string" && summary(r.summary)
    && Array.isArray(r.periods) && r.periods.every(p => typeof p?.date === "string" && summary(p))
    && Array.isArray(r.issues) && r.issues.every(i => i && ["id", "reference", "vendorId", "reason"].every(k => typeof i[k] === "string"));
}

const tone = (v: string | null) => v == null ? "#B4770E" : v.startsWith("-") ? "#B42318" : "#15803D";

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return <div className="rounded-xl border p-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>{label}</p>
    <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: color ?? "var(--t-text)" }}>{value}</p>
    {hint && <p className="mt-0.5 text-[11px]" style={{ color: "var(--t-subtle)" }}>{hint}</p>}
  </div>;
}

export function ReportBody({ report, showDaily }: { report: ProfitReport; showDaily: boolean }) {
  const s = report.summary;
  const noKnownProfit = s.includedCount === 0 && s.unavailableCount > 0;
  const rows = showDaily ? report.periods : [];
  return <div className="space-y-4" data-testid="report-body">
    {s.totalCount === 0 && <p className="rounded-lg border border-dashed p-5 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>No supplier submissions in this range.</p>}
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <Stat label="Product revenue" value={moneyOf(s.salesUsd)} hint="Known product sales" />
      <Stat label="Matched sales" value={moneyOf(s.matchedSalesUsd)} hint="Sales with complete supplier cost" />
      <Stat label="Supplier product cost" value={noKnownProfit ? "Unavailable" : moneyOf(s.costUsd)} hint="Matched submissions only" color="var(--t-blue-deep)" />
      <Stat label="Est. product profit" value={noKnownProfit ? "Unavailable" : signedMoneyOf(s.profitUsd)} color={tone(noKnownProfit ? null : s.profitUsd)} />
      <Stat label="Margin" value={formatPercent(s.marginPercent)} hint="Profit ÷ matched sales" color={tone(s.marginPercent)} />
    </div>
    <div className="flex flex-wrap gap-2 text-[11.5px]" data-testid="report-counts">
      {[["Submissions", s.totalCount, "var(--t-text)"], ["Included", s.includedCount, "#15803D"], ["Excluded (cancelled/recalled)", s.excludedCount - (s.refundExcludedCount ?? s.refundCount), "var(--t-subtle)"],
        ["Unknown historical values", s.unavailableCount, "#B4770E"], ["Refund affected", s.refundCount, "#B42318"]].map(([l, n, c]) =>
        <span key={l as string} className="rounded-full border px-2.5 py-1" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
          {l} <strong className="tabular-nums" style={{ color: c as string }}>{n}</strong></span>)}
    </div>
    {s.productRefundUsd != null && <p data-testid="product-refunds-applied" className="text-xs">
      Product refunds applied: <strong>{moneyOf(s.productRefundUsd)}</strong>. Supplier costs remain unchanged.
      {" "}{s.refundExcludedCount ?? 0} refund-affected submission(s) still excluded.
    </p>}
    {report.adjustments?.some(a => !a.reason && a.reviews.length > 0) && <details className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--t-border)" }}>
      <summary data-testid="product-refund-history">Reviewed product refund evidence</summary>
      <ul className="mt-2 space-y-2">{report.adjustments.filter(a => !a.reason).flatMap(a => a.reviews.map(review =>
        <li key={`${a.submissionId}-${review.refundId}`} data-testid={`product-refund-evidence-${a.submissionId}-${review.refundId}`}>
          {a.reference} · {review.refundId} · {moneyOf(review.productRefundUsd)} · Reviewed by {review.reviewedBy} on {new Date(review.reviewedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}. {review.note}
        </li>))}</ul>
    </details>}
    {s.unavailableCount > 0 && <p role="status" className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>Partial historical data: {s.unavailableCount} submission(s) have unknown sales or supplier costs. Only known amounts are included; unknown costs are not zero.</p>}
    {showDaily && <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--t-border)" }}>
      <table className="w-full min-w-[760px] text-left text-xs tabular-nums" data-testid="report-daily">
        <thead style={{ background: "var(--t-bg)", color: "var(--t-subtle)" }}><tr>
          <th className="p-2">Date</th><th className="p-2 text-right">Revenue</th><th className="p-2 text-right">Matched sales</th><th className="p-2 text-right">Cost</th>
          <th className="p-2 text-right">Profit</th><th className="p-2 text-right">Margin</th><th className="p-2 text-right">Included / total</th><th className="p-2 text-right">Flags</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={8} className="p-3 text-center" style={{ color: "var(--t-subtle)" }}>No supplier submissions in this range.</td></tr>}
          {rows.map(p => <tr key={p.date} className="border-t" style={{ borderColor: "var(--t-border)" }}>
            <td className="p-2 font-mono">{p.date}</td><td className="p-2 text-right">{moneyOf(p.salesUsd)}</td><td className="p-2 text-right">{moneyOf(p.matchedSalesUsd)}</td>
            <td className="p-2 text-right">{p.includedCount === 0 && p.unavailableCount > 0 ? "Unavailable" : moneyOf(p.costUsd)}</td><td className="p-2 text-right font-semibold" style={{ color: tone(p.profitUsd) }}>{p.includedCount === 0 && p.unavailableCount > 0 ? "Unavailable" : signedMoneyOf(p.profitUsd)}</td>
            <td className="p-2 text-right" style={{ color: tone(p.marginPercent) }}>{formatPercent(p.marginPercent)}</td>
            <td className="p-2 text-right">{p.includedCount} / {p.totalCount}</td>
            <td className="p-2 text-right" style={{ color: "var(--t-subtle)" }}>{[p.excludedCount && `${p.excludedCount} excl.`, p.unavailableCount && `${p.unavailableCount} unknown`, p.refundCount && `${p.refundCount} refund`].filter(Boolean).join(" · ") || "—"}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
    {report.issues.length > 0 && <section className="rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, #E9A020 45%, var(--t-border))", background: "color-mix(in srgb, #E9A020 6%, var(--t-surface))" }} data-testid="report-issues">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A5A00" }}>Not counted in profit ({report.issues.length})</p>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
        {report.issues.map(i => <li key={i.id} className="flex flex-wrap gap-x-2"><span className="font-mono font-semibold">{i.reference}</span><span style={{ color: "var(--t-subtle)" }}>{i.reason}</span></li>)}
      </ul>
    </section>}
    <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
      USD · Dated by supplier submission date ({report.timeZone}), not payment date. {report.from} to {report.to} inclusive. Revenue is known product sales less reviewed completed product refunds; cost and profit only include submissions with matched sales and supplier product costs, before shipping, discounts, credits, fees, tax and overheads—not net profit. Refund adjustments restate the original submission period, not the refund date. Cancelled, recalled and unresolved refund-affected rows are excluded.
    </p>
  </div>;
}

type Request = RefundRequest;

export function RevenueProfitReport({ vendors, request }: { vendors: { id: string; name: string }[]; request: Request }) {
  const [preset, setPreset] = useState<Preset>("monthly");
  const [range, setRange] = useState<Range>(() => presetRange("monthly", londonToday()));
  const [vendorId, setVendorId] = useState("");
  const [showDaily, setShowDaily] = useState(false);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const gen = useRef(0);
  const requestRef = useRef(request);
  requestRef.current = request;
  const valid = validRange(range);
  const key = valid ? reportPath(range, vendorId) : "";
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback(async (path: string) => {
    if (!path) return;
    const run = ++gen.current;
    setLoading(true); setError(null);
    try {
      const result = await requestRef.current(path);
      if (run !== gen.current) return;
      if (!isReport(result)) throw new Error("The report response was incomplete. Refresh and try again.");
      setReport(result);
    } catch (e) {
      if (run !== gen.current) return;
      setReport(null); // never show stale amounts for a different range after an error
      setError(e instanceof Error ? e.message : "Could not load the report.");
    } finally { if (run === gen.current) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!key) { gen.current++; setReport(null); setLoading(false); return; }
    setReport(null);
    void load(key);
  }, [key, load]);
  useEffect(() => {
    const onFocus = () => { if (keyRef.current) void load(keyRef.current); };
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("focus", onFocus); gen.current++; };
  }, [load]);

  const choose = (p: Preset) => { setPreset(p); if (p !== "custom") setRange(presetRange(p, londonToday())); };
  const vendorName = vendors.find(v => v.id === vendorId)?.name ?? "All vendors";

  return <section className="space-y-4" data-testid="revenue-profit-report" aria-label="Revenue and profit report">
    <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Report period">
        {PRESETS.map(p => <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => choose(p.key)} data-testid={`report-preset-${p.key}`}
          className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
          style={preset === p.key ? { background: "var(--t-blue-deep)", color: "#fff" } : { color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}>{p.label}</button>)}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className="pap-btn" aria-label="Previous period" disabled={!valid} onClick={() => setRange(r => shiftRange(preset, r, -1))} data-testid="report-prev"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <label className="block text-xs" style={{ color: "var(--t-subtle)" }}>From
          <input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={range.from} data-testid="report-from"
            onChange={e => { setPreset("custom"); setRange(r => ({ ...r, from: e.target.value })); }} /></label>
        <label className="block text-xs" style={{ color: "var(--t-subtle)" }}>To
          <input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={range.to} data-testid="report-to"
            onChange={e => { setPreset("custom"); setRange(r => ({ ...r, to: e.target.value })); }} /></label>
        <button type="button" className="pap-btn" aria-label="Next period" disabled={!valid} onClick={() => setRange(r => shiftRange(preset, r, 1))} data-testid="report-next"><ChevronRight className="h-3.5 w-3.5" /></button>
        <label className="block min-w-[180px] text-xs" style={{ color: "var(--t-subtle)" }}>Report vendor
          <select className={inputCls + " !min-h-[36px]"} style={inputStyle} value={vendorId} onChange={e => setVendorId(e.target.value)} data-testid="report-vendor">
            <option value="">All vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select></label>
        <label className="flex min-h-[36px] items-center gap-2 text-xs font-medium"><input type="checkbox" checked={showDaily} onChange={e => setShowDaily(e.target.checked)} data-testid="report-daily-toggle" />Daily breakdown</label>
        <button type="button" className="pap-btn ml-auto" disabled={!valid || loading} onClick={() => void load(key)} data-testid="report-refresh"><RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />Refresh report</button>
      </div>
      {!valid && <p role="alert" className="text-xs font-medium" style={{ color: "#B42318" }} data-testid="report-range-error">Choose valid From and To dates; From must be on or before To.</p>}
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "#ef4444", background: "color-mix(in srgb, #ef4444 7%, var(--t-surface))" }} data-testid="report-error">
      <span>{error}</span><button type="button" className="font-semibold underline" onClick={() => void load(key)}>Retry</button></div>}
    {valid && loading && !report && <><p role="status" className="text-sm" style={{ color: "var(--t-subtle)" }}>Loading {vendorName} revenue and profit…</p><Skeleton /></>}
    {report && <div style={{ opacity: loading ? 0.6 : 1 }} aria-busy={loading}>
      <ReportBody report={report} showDaily={showDaily} />
      {!loading && <ProductRefundReview key={key} refunds={report.refundReviews ?? []} request={request}
        onSaved={() => { void load(keyRef.current); }} />}
    </div>}
  </section>;
}
