import { usdToCents } from "./refund-money";
import { productMargin, signedUsd } from "./vendor-payment-profit";
import { VendorPortalError } from "./vendor-portal-model";

const london = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
export function londonDay(value: string | Date) {
  const parts = Object.fromEntries(london.formatToParts(new Date(value)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function dateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\d$/.test(value)) throw new VendorPortalError("Choose valid From and To dates.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100)
    throw new VendorPortalError("Choose valid From and To dates.");
  return date;
}
function midnight(date: Date) {
  const parts = Object.fromEntries(london.formatToParts(date).map(p => [p.type, p.value]));
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(date.getTime() - (local - date.getTime()));
}
export function londonReportRange(from: unknown, to: unknown) {
  const first = dateOnly(from), last = dateOnly(to);
  if (last < first || last.getTime() - first.getTime() > 3660 * 86400000) throw new VendorPortalError("Choose an ordered date range of ten years or less.");
  const next = new Date(last.getTime() + 86400000);
  return { start: midnight(first), end: midnight(next) };
}
function counts() {
  return { sales: 0n, costs: 0n, profit: 0n, matched: 0n, totalCount: 0, includedCount: 0, excludedCount: 0, unavailableCount: 0, refundCount: 0 };
}
function project(c: ReturnType<typeof counts>) {
  return { salesUsd: signedUsd(c.sales), costUsd: signedUsd(c.costs), profitUsd: signedUsd(c.profit),
    matchedSalesUsd: signedUsd(c.matched), marginPercent: productMargin(c.profit, c.matched),
    totalCount: c.totalCount, includedCount: c.includedCount, excludedCount: c.excludedCount,
    unavailableCount: c.unavailableCount, refundCount: c.refundCount };
}
export function aggregateProfitReport(rows: any[], from: string, to: string) {
  const range = londonReportRange(from, to), summary = counts();
  const days = new Map<string, ReturnType<typeof counts>>();
  const seen = new Set<string>();
  const issues: { id: string; reference: string; vendorId: string; reason: string }[] = [];
  for (const row of rows) {
    const submitted = new Date(row.submittedAt);
    if (!Number.isFinite(submitted.getTime()) || submitted < range.start || submitted >= range.end || seen.has(row.id)) continue;
    seen.add(row.id);
    const day = londonDay(submitted);
    const bucket = days.get(day) ?? counts();
    days.set(day, bucket);
    const groups = [summary, bucket];
    groups.forEach(g => g.totalCount++);
    const issue = (reason: string) => issues.push({ id: row.id, reference: row.reference, vendorId: row.vendorId, reason });
    if (["Cancelled", "Canceled", "Recalled"].includes(row.status)) {
      groups.forEach(g => g.excludedCount++); issue("Cancelled or recalled submission excluded."); continue;
    }
    if (row.refundAffected) {
      groups.forEach(g => { g.refundCount++; g.excludedCount++; });
      issue("Refund-affected order excluded pending a reliable product-only adjustment."); continue;
    }
    let sales: bigint | null = null;
    try { if (row.profit?.salesUsd != null) sales = usdToCents(row.profit.salesUsd); } catch { /* Explicit unavailable count below. */ }
    if (sales != null) groups.forEach(g => g.sales += sales!);
    try {
      if (sales == null || row.profit?.supplierProductsUsd == null || row.profit?.amountUsd == null) throw Error();
      const cost = usdToCents(row.profit.supplierProductsUsd), profit = sales - cost;
      if (signedUsd(profit) !== row.profit.amountUsd) throw Error();
      groups.forEach(g => { g.costs += cost; g.profit += profit; g.matched += sales!; g.includedCount++; });
    } catch {
      groups.forEach(g => g.unavailableCount++);
      issue(row.profit?.reason ?? "Historical sales or supplier costs unavailable; excluded from paired profit totals.");
    }
  }
  return { currency: "USD", timeZone: "Europe/London", dateBasis: "supplier_submission", from, to,
    summary: project(summary), periods: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, c]) => ({ date, ...project(c) })),
    issues };
}
