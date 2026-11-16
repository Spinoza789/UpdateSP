export type Preset = "daily" | "weekly" | "monthly" | "quarterly" | "biannual" | "custom";
export type Range = { from: string; to: string };

export const PRESETS: { key: Preset; label: string }[] = [
  { key: "daily", label: "Daily" }, { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" }, { key: "biannual", label: "Bi-annually" }, { key: "custom", label: "Custom" },
];

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
function parse(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || iso(d) !== v ? null : d;
}
const ymd = (y: number, m: number, day: number) => iso(new Date(Date.UTC(y, m, day)));
const addDays = (v: string, n: number) => iso(new Date(parse(v)!.getTime() + n * DAY));

/** Current calendar date in Europe/London. */
export function londonToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function monthSpan(anchor: string, months: number): Range {
  const d = parse(anchor)!;
  const y = d.getUTCFullYear();
  const start = Math.floor(d.getUTCMonth() / months) * months;
  return { from: ymd(y, start, 1), to: ymd(y, start + months, 0) };
}

export function presetRange(preset: Preset, anchor: string): Range {
  switch (preset) {
    case "weekly": {
      const dow = (parse(anchor)!.getUTCDay() + 6) % 7; // Monday = 0
      const from = addDays(anchor, -dow);
      return { from, to: addDays(from, 6) };
    }
    case "monthly": return monthSpan(anchor, 1);
    case "quarterly": return monthSpan(anchor, 3);
    case "biannual": return monthSpan(anchor, 6);
    default: return { from: anchor, to: anchor };
  }
}

export function shiftRange(preset: Preset, range: Range, dir: 1 | -1): Range {
  if (preset === "custom") {
    const len = Math.round((parse(range.to)!.getTime() - parse(range.from)!.getTime()) / DAY) + 1;
    return { from: addDays(range.from, dir * len), to: addDays(range.to, dir * len) };
  }
  if (preset === "daily") return presetRange("daily", addDays(range.from, dir));
  if (preset === "weekly") return presetRange("weekly", addDays(range.from, dir * 7));
  const months = preset === "monthly" ? 1 : preset === "quarterly" ? 3 : 6;
  const d = parse(range.from)!;
  return presetRange(preset, ymd(d.getUTCFullYear(), d.getUTCMonth() + dir * months, 1));
}

export function validRange(r: Range) {
  const a = parse(r.from); const b = parse(r.to);
  return !!a && !!b && a.getTime() <= b.getTime();
}

export function reportPath(r: Range, vendorId: string) {
  const q = new URLSearchParams({ from: r.from, to: r.to });
  if (vendorId) q.set("vendorId", vendorId);
  return `/api/admin/vendor-payments/report?${q.toString().replace(/\+/g, "%20")}`;
}

export function formatPercent(v: string | null | undefined) {
  if (v === null || v === undefined || !/^-?\d+(\.\d+)?$/.test(String(v).trim())) return "Unavailable";
  return `${Number(v).toFixed(2)}%`;
}
