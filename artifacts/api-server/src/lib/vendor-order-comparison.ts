import { sql } from "drizzle-orm";
import { vendorSubmissionsTable } from "@workspace/db";
import { londonReportRange } from "./vendor-profit-report";

type Range = { from: string; to: string };
type Bucket = { date: string; count: string | number; excluded: string | number };

function count(value: string | number) {
  const parsed = Number(value);
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(parsed)) throw new Error("Invalid supplier order count.");
  return parsed;
}

/** Each supplier shipment is one order, even when it combines several members. */
export function buildOrderComparison(rows: Bucket[], current: Range, previous: Range, vendorId?: string) {
  londonReportRange(current.from, current.to);
  londonReportRange(previous.from, previous.to);
  const days = new Map(rows.map(row => [row.date, { count: count(row.count), excluded: count(row.excluded) }]));
  function period(range: Range) {
    let total = 0, excluded = 0;
    const daily: { date: string; count: number }[] = [];
    const last = new Date(`${range.to}T00:00:00Z`);
    for (const day = new Date(`${range.from}T00:00:00Z`); day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      const bucket = days.get(date);
      total += bucket?.count ?? 0;
      excluded += bucket?.excluded ?? 0;
      daily.push({ date, count: bucket?.count ?? 0 });
    }
    return { ...range, total, excluded, daily };
  }
  const a = period(current), b = period(previous), difference = a.total - b.total;
  return { timeZone: "Europe/London" as const, vendorId: vendorId ?? null,
    current: a, previous: b, difference,
    percentChange: b.total === 0 ? null : (difference * 100 / b.total).toFixed(2) };
}

/** Read-only SQL aggregation across the entire ledger, never the visible page. */
export async function vendorOrderComparison(
  tx: any, vendorId: string | undefined, from: string, to: string, compareFrom: string, compareTo: string,
) {
  const a = londonReportRange(from, to), b = londonReportRange(compareFrom, compareTo);
  const t = vendorSubmissionsTable;
  const day = sql`to_char(${t.submittedAt} AT TIME ZONE 'Europe/London', 'YYYY-MM-DD')`;
  const excluded = sql`lower(trim(${t.status})) IN ('cancelled', 'canceled', 'recalled')`;
  const result = await tx.execute(sql`
    SELECT ${day} AS date,
      count(*) FILTER (WHERE NOT (${excluded}))::text AS count,
      count(*) FILTER (WHERE ${excluded})::text AS excluded
    FROM ${t}
    WHERE (${vendorId ? sql`${t.vendorId} = ${vendorId}` : sql`true`})
      AND ((${t.submittedAt} >= ${a.start.toISOString()}::timestamptz AND ${t.submittedAt} < ${a.end.toISOString()}::timestamptz)
        OR (${t.submittedAt} >= ${b.start.toISOString()}::timestamptz AND ${t.submittedAt} < ${b.end.toISOString()}::timestamptz))
    GROUP BY ${day}
    ORDER BY date
  `);
  return buildOrderComparison(result.rows, { from, to }, { from: compareFrom, to: compareTo }, vendorId);
}
