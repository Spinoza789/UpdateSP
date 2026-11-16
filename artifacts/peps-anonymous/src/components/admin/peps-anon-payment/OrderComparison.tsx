import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Notice } from "./Overlay";
import { inputCls, inputStyle, Skeleton } from "../../reshipper-payouts/ui";
import { londonToday, PRESETS, presetRange, shiftRange, validRange, type Preset, type Range } from "./reportDates";

export type OrderComparisonPeriod = {
  from: string;
  to: string;
  total: number;
  excluded: number;
  daily: { date: string; count: number }[];
};

export type OrderComparisonReport = {
  timeZone: "Europe/London";
  vendorId: string | null;
  current: OrderComparisonPeriod;
  previous: OrderComparisonPeriod;
  difference: number;
  percentChange: string | null;
};

type Vendor = { id: string; name: string };
type Request = (path: string, init?: RequestInit) => Promise<any>;
type ComparisonMode = "previous" | "custom";

const DAY = 86_400_000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isWithinTenYears(range: Range) {
  if (!validRange(range)) return false;
  const start = new Date(`${range.from}T00:00:00Z`);
  const exclusiveEnd = new Date(start);
  exclusiveEnd.setUTCFullYear(exclusiveEnd.getUTCFullYear() + 10);
  return new Date(`${range.to}T00:00:00Z`).getTime() < exclusiveEnd.getTime();
}

function dayCount(range: Range) {
  return Math.floor((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY) + 1;
}

function pathFor(current: Range, comparison: Range, vendorId: string) {
  const query = new URLSearchParams({
    from: current.from,
    to: current.to,
    compareFrom: comparison.from,
    compareTo: comparison.to,
  });
  if (vendorId) query.set("vendorId", vendorId);
  return `/api/admin/vendor-payments/order-comparison?${query.toString()}`;
}

function validPeriod(value: unknown, expected: Range): value is OrderComparisonPeriod {
  const period = value as Record<string, unknown> | null;
  if (!period || period.from !== expected.from || period.to !== expected.to
    || !isDate(period.from) || !isDate(period.to) || !validRange({ from: period.from, to: period.to })
    || !Number.isSafeInteger(period.total) || Number(period.total) < 0
    || !Number.isSafeInteger(period.excluded) || Number(period.excluded) < 0
    || !Array.isArray(period.daily)) return false;
  const seen = new Set<string>();
  let dailyTotal = 0;
  for (const entry of period.daily) {
    const row = entry as Record<string, unknown> | null;
    if (!row || !isDate(row.date) || row.date < period.from || row.date > period.to
      || !Number.isSafeInteger(row.count) || Number(row.count) < 0 || seen.has(row.date)) return false;
    seen.add(row.date);
    dailyTotal += Number(row.count);
    if (!Number.isSafeInteger(dailyTotal)) return false;
  }
  return dailyTotal === period.total;
}

export function isOrderComparisonReport(value: unknown, current: Range, previous: Range, vendorId: string): value is OrderComparisonReport {
  const report = value as Record<string, unknown> | null;
  if (!report || report.timeZone !== "Europe/London" || report.vendorId !== (vendorId || null)
    || !validPeriod(report.current, current) || !validPeriod(report.previous, previous)
    || !Number.isSafeInteger(report.difference)
    || Number(report.difference) !== report.current.total - report.previous.total) return false;
  if (report.previous.total === 0) return report.percentChange === null;
  return typeof report.percentChange === "string"
    && /^-?\d+(?:\.\d+)?$/.test(report.percentChange)
    && Number.isFinite(Number(report.percentChange));
}

function Stat({ label, value, hint, color, testId }: { label: string; value: string; hint?: string; color?: string; testId: string }) {
  return <div className="rounded-xl border p-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }} data-testid={testId}>
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>{label}</p>
    <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: color ?? "var(--t-text)" }}>{value}</p>
    {hint && <p className="mt-0.5 text-[11px]" style={{ color: "var(--t-subtle)" }}>{hint}</p>}
  </div>;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
}

function dateLabel(range: Range) {
  return `${range.from} to ${range.to} inclusive`;
}

function Summary({ report, current, comparison, loading }: { report: OrderComparisonReport; current: Range; comparison: Range; loading: boolean }) {
  const percent = report.percentChange === null
    ? report.current.total > 0 ? "New activity" : "No change"
    : `${Number(report.percentChange) > 0 ? "+" : ""}${Number(report.percentChange).toFixed(2)}%`;
  const changeColor = report.difference > 0 ? "#15803D" : report.difference < 0 ? "#B42318" : "var(--t-text)";
  return <div className="space-y-4" data-testid="order-comparison-summary" style={{ opacity: loading ? 0.6 : 1 }} aria-busy={loading}>
    {report.current.total === 0 && report.previous.total === 0 && <p className="rounded-lg border border-dashed p-5 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }} data-testid="order-comparison-empty">
      No supplier submissions in either period. Cancelled and recalled submissions are excluded.
    </p>}
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Stat label="Current submissions" value={String(report.current.total)} hint={`${report.current.excluded} cancelled/recalled excluded`} testId="order-comparison-current-total" />
      <Stat label="Comparison submissions" value={String(report.previous.total)} hint={`${report.previous.excluded} cancelled/recalled excluded`} testId="order-comparison-previous-total" />
      <Stat label="Change" value={signed(report.difference)} hint="Supplier submissions" color={changeColor} testId="order-comparison-difference" />
      <Stat label="Percentage change" value={percent} hint="Compared with the selected baseline" color={changeColor} testId="order-comparison-percent" />
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        <p className="font-bold" style={{ color: "var(--t-text)" }}>Current period</p>
        <p className="mt-0.5 font-mono tabular-nums" style={{ color: "var(--t-subtle)" }} data-testid="order-comparison-current-label">{dateLabel(current)} · Europe/London</p>
      </div>
      <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        <p className="font-bold" style={{ color: "var(--t-text)" }}>Comparison period</p>
        <p className="mt-0.5 font-mono tabular-nums" style={{ color: "var(--t-subtle)" }} data-testid="order-comparison-previous-label">{dateLabel(comparison)} · Europe/London</p>
      </div>
    </div>
    <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
      Read-only supplier-accounting report. Each supplier submission is counted once by its London submission date, regardless of payment completeness. Cancelled and recalled submissions are excluded. This report does not change member orders.
    </p>
  </div>;
}

export function OrderComparison({ vendors, request }: { vendors: Vendor[]; request: Request }) {
  const [preset, setPreset] = useState<Preset>("monthly");
  const [range, setRange] = useState<Range>(() => presetRange("monthly", londonToday()));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
  const [customComparison, setCustomComparison] = useState<Range>(() => shiftRange("monthly", presetRange("monthly", londonToday()), -1));
  const [vendorId, setVendorId] = useState("");
  const [report, setReport] = useState<OrderComparisonReport | null>(null);
  const [reportKey, setReportKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const requestRef = useRef(request);
  requestRef.current = request;
  const focusRequestRef = useRef({ range, comparison: { from: "", to: "" }, vendorId });

  const automaticComparison = useMemo(() => {
    if (!validRange(range)) return { from: "", to: "" };
    return shiftRange(preset, range, -1);
  }, [preset, range.from, range.to]);
  const comparison = comparisonMode === "custom" ? customComparison : automaticComparison;
  focusRequestRef.current = { range, comparison, vendorId };
  const currentValid = validRange(range) && isWithinTenYears(range);
  const comparisonValid = validRange(comparison) && isWithinTenYears(comparison);
  const key = currentValid && comparisonValid ? pathFor(range, comparison, vendorId) : "";
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback(async (path: string, current: Range, previous: Range, selectedVendor: string) => {
    if (!path) return;
    const run = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await requestRef.current(path);
      if (run !== generation.current) return;
      if (!isOrderComparisonReport(result, current, previous, selectedVendor))
        throw new Error("The order comparison response did not match the selected periods. Refresh and try again.");
      setReport(result);
      setReportKey(path);
    } catch (cause) {
      if (run !== generation.current) return;
      setReport(null);
      setReportKey("");
      setError(cause instanceof Error ? cause.message : "Could not load the order comparison.");
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!key) {
      generation.current++;
      setReport(null);
      setReportKey("");
      setError(null);
      setLoading(false);
      return;
    }
    setReport(null);
    setReportKey("");
    void load(key, range, comparison, vendorId);
  }, [key, load]);

  useEffect(() => {
    const onFocus = () => {
      const latest = focusRequestRef.current;
      if (keyRef.current) void load(keyRef.current, latest.range, latest.comparison, latest.vendorId);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      generation.current++;
    };
  }, [load]);

  const changePreset = (next: Preset) => {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next, londonToday()));
    else setRange((previous) => previous.from && previous.to ? previous : { from: londonToday(), to: londonToday() });
  };
  const switchToCustomComparison = () => {
    setCustomComparison(automaticComparison);
    setComparisonMode("custom");
  };
  const rangeError = !validRange(range)
    ? "Choose valid current-period dates; From must be on or before To."
    : !isWithinTenYears(range)
      ? "A reporting period cannot exceed 10 years."
      : !validRange(comparison)
        ? "Choose valid comparison dates; From must be on or before To."
        : !isWithinTenYears(comparison)
          ? "A comparison period cannot exceed 10 years."
          : null;
  const vendorName = vendors.find((vendor) => vendor.id === vendorId)?.name ?? "All vendors";
  const currentHasFutureDates = currentValid && range.to > londonToday();
  const lengthsDiffer = currentValid && comparisonValid && dayCount(range) !== dayCount(comparison);
  const visibleReport = reportKey === key ? report : null;

  return <section className="space-y-4" data-testid="orders-comparison" aria-label="Supplier order comparison">
    <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Current report period">
        {PRESETS.map((item) => <button key={item.key} type="button" aria-pressed={preset === item.key}
          onClick={() => changePreset(item.key)} data-testid={`comparison-preset-${item.key}`}
          className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
          style={preset === item.key ? { background: "var(--t-blue-deep)", color: "#fff" } : { color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}>{item.label}</button>)}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className="pap-btn" aria-label="Previous period" disabled={!currentValid}
          onClick={() => setRange((previous) => shiftRange(preset, previous, -1))} data-testid="order-comparison-prev"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <label className="block text-xs" style={{ color: "var(--t-subtle)" }}>Current from
          <input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={range.from}
            onChange={(event) => { setPreset("custom"); setRange((previous) => ({ ...previous, from: event.target.value })); }}
            data-testid="comparison-from" /></label>
        <label className="block text-xs" style={{ color: "var(--t-subtle)" }}>Current to
          <input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={range.to}
            onChange={(event) => { setPreset("custom"); setRange((previous) => ({ ...previous, to: event.target.value })); }}
            data-testid="comparison-to" /></label>
        <button type="button" className="pap-btn" aria-label="Next period" disabled={!currentValid}
          onClick={() => setRange((previous) => shiftRange(preset, previous, 1))} data-testid="order-comparison-next"><ChevronRight className="h-3.5 w-3.5" /></button>
        <label className="block min-w-[180px] text-xs" style={{ color: "var(--t-subtle)" }}>Report vendor
          <select className={inputCls + " !min-h-[36px]"} style={inputStyle} value={vendorId} onChange={(event) => setVendorId(event.target.value)} data-testid="order-comparison-vendor">
            <option value="">All vendors</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
          </select>
        </label>
        <button type="button" className="pap-btn ml-auto" disabled={!key || loading}
          onClick={() => void load(key, range, comparison, vendorId)} data-testid="order-comparison-refresh">
          <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />Refresh comparison
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--t-border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--t-subtle)" }}>Compare against</span>
        <button type="button" aria-pressed={comparisonMode === "previous"} onClick={() => setComparisonMode("previous")}
          className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          style={comparisonMode === "previous" ? { background: "var(--t-blue-deep)", color: "#fff" } : { border: "1px solid var(--t-border)", color: "var(--t-subtle)" }}
          data-testid="order-comparison-compare-previous">Previous period</button>
        <button type="button" aria-pressed={comparisonMode === "custom"} onClick={switchToCustomComparison}
          className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          style={comparisonMode === "custom" ? { background: "var(--t-blue-deep)", color: "#fff" } : { border: "1px solid var(--t-border)", color: "var(--t-subtle)" }}
          data-testid="order-comparison-compare-custom">Custom dates</button>
        {comparisonMode === "custom" ? <>
          <label className="block text-xs" style={{ color: "var(--t-subtle)" }}>Compare from
            <input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={customComparison.from}
              onChange={(event) => setCustomComparison((previous) => ({ ...previous, from: event.target.value }))}
              data-testid="comparison-compare-from" /></label>
          <label className="block text-xs" style={{ color: "var(--t-subtle)" }}>Compare to
            <input type="date" className={inputCls + " !min-h-[36px]"} style={inputStyle} value={customComparison.to}
              onChange={(event) => setCustomComparison((previous) => ({ ...previous, to: event.target.value }))}
              data-testid="comparison-compare-to" /></label>
        </> : <p className="text-xs" style={{ color: "var(--t-subtle)" }} data-testid="order-comparison-auto-label">
          {dateLabel(automaticComparison)} · previous {preset === "custom" ? "same-length period" : "calendar period"}
        </p>}
      </div>
      {rangeError && <p role="alert" className="text-xs font-medium" style={{ color: "#B42318" }} data-testid="order-comparison-range-error">{rangeError}</p>}
    </div>

    {currentHasFutureDates && <p role="status" className="rounded-lg border p-3 text-xs" style={{ borderColor: "color-mix(in srgb, #E9A020 45%, var(--t-border))", background: "color-mix(in srgb, #E9A020 6%, var(--t-surface))", color: "#8A5A00" }} data-testid="order-comparison-future-warning">
      The current period includes future dates through {range.to}; this period is incomplete and its count may change.
    </p>}
    {lengthsDiffer && <p role="status" className="rounded-lg border p-3 text-xs" style={{ borderColor: "color-mix(in srgb, #E9A020 45%, var(--t-border))", background: "color-mix(in srgb, #E9A020 6%, var(--t-surface))", color: "#8A5A00" }} data-testid="order-comparison-length-warning">
      These periods have different lengths ({dayCount(range)} days vs {dayCount(comparison)} days); compare totals with that difference in mind.
    </p>}

    {error && <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3" style={{ borderColor: "color-mix(in srgb, #B42318 30%, var(--t-border))", background: "var(--t-surface)" }} data-testid="order-comparison-error">
      <div className="min-w-0 flex-1"><Notice message={{ ok: false, text: error }} /></div>
      <button type="button" className="mt-1 text-xs font-semibold underline" onClick={() => void load(key, range, comparison, vendorId)}
        disabled={!key || loading} data-testid="order-comparison-retry">Retry</button>
    </div>}
    {key && loading && !visibleReport && <div data-testid="order-comparison-loading">
      <p role="status" className="mb-2 text-sm" style={{ color: "var(--t-subtle)" }}>Loading {vendorName} submission counts…</p>
      <Skeleton />
    </div>}
    {visibleReport && <Summary report={visibleReport} current={range} comparison={comparison} loading={loading} />}
  </section>;
}
