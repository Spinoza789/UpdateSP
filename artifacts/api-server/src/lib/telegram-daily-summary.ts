import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getAdminChatId, sendTelegramMessageFull } from "./telegram";
import { pendingPaymentSql, claimTelegramReminder, telegramAppUrl, telegramJobDelay } from "./telegram-reminders";
import { escapeTelegramHtml as esc } from "./telegram-package-tracking";
import { registerScheduler } from "./scheduler-registry";

export function londonSummarySlot(now: Date): string | null {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return value("hour") === "08" && value("minute") === "00"
    ? `${value("year")}-${value("month")}-${value("day")}` : null;
}
const count = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
function staleCount(rows: Record<string, unknown>[], now: Date): number {
  let total = 0;
  for (const row of rows) {
    const dates = Array.isArray(row.dates) ? row.dates : [];
    let latest = -Infinity;
    for (const date of dates) if (typeof date === "string") {
      const time = Date.parse(date); if (Number.isFinite(time)) latest = Math.max(latest, time);
    }
    if (Number.isFinite(latest) && latest < now.getTime() - 7 * 86_400_000) total++;
  }
  return total;
}
function safeError(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, "[URL]").replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[email]")
    .replace(/@[\w]+/g, "[account]").replace(/\b\d{6,}\b/g, "[id]").slice(0, 150);
}
export async function runDailyAdminSummary({ now = new Date(), sleep = telegramJobDelay } = {}): Promise<boolean> {
  if (!process.env["PUBLIC_URL"]) return false;
  const day = londonSummarySlot(now);
  if (!day) return false;
  const config = await db.execute(sql`SELECT value FROM site_config WHERE key = 'telegramDailySummaryEnabled'`);
  if (config.rows[0]?.value === "false") return false;
  const chatId = await getAdminChatId();
  if (!chatId) return false;
  const unpaid = await db.execute(sql`SELECT count(*) AS count FROM orders o
    WHERE ${sql.raw(pendingPaymentSql("o"))} AND o.payment_status <> 'pending_confirmation'
      AND o.created_at < now() - interval '24 hours'`);
  const tickets = await db.execute(sql`SELECT count(*) FILTER (WHERE status = 'open') AS open,
    count(*) FILTER (WHERE status = 'in_progress') AS progress, min(created_at) AS oldest
    FROM tickets WHERE status IN ('open', 'in_progress')`);
  // Read only event dates, never member names, message bodies, addresses or tracking numbers.
  const parcels = await db.execute(sql`SELECT jsonb_path_query_array(COALESCE(cached_events, '[]'::jsonb), '$[*].date') AS dates
    FROM gb_parcels WHERE status <> 'delivered'`);
  const orders = await db.execute(sql`SELECT jsonb_path_query_array(COALESCE(tracking_events, '[]'::jsonb), '$[*].date') AS dates FROM orders
    WHERE deleted_at IS NULL AND status <> 'Cancelled' AND COALESCE(tracking_status, '') <> 'delivered'`);
  const failures = await db.execute(sql`SELECT COALESCE(error_message, 'Unknown error') AS error, count(*) AS count
    FROM telegram_message_logs WHERE NOT delivered AND sent_at > now() - interval '24 hours'
      AND COALESCE(error_message, '') NOT LIKE 'skipped:%'
    GROUP BY error_message ORDER BY count(*) DESC`);
  // Claims precede transport, so only successful transport logs count as sent.
  const reminders = await db.execute(sql`SELECT CASE event_key
    WHEN 'customer_payment_reminder' THEN 'payment_reminder' ELSE 'gb_closing' END AS kind, count(*) AS count
    FROM telegram_message_logs WHERE delivered AND sent_at > now() - interval '24 hours'
      AND event_key IN ('customer_payment_reminder', 'customer_gb_closing_soon') GROUP BY event_key`);
  const pending = count(unpaid.rows[0]?.count), open = count(tickets.rows[0]?.open), progress = count(tickets.rows[0]?.progress);
  const staleParcels = staleCount(parcels.rows, now), staleOrders = staleCount(orders.rows, now);
  const errors = failures.rows.filter(row => !String(row.error).startsWith("skipped:"));
  const failed = errors.reduce((sum, row) => sum + count(row.count), 0);
  const payment = count(reminders.rows.find(row => row.kind === "payment_reminder")?.count);
  const closing = count(reminders.rows.find(row => row.kind === "gb_closing")?.count);
  let text = "All clear";
  if (pending + open + progress + staleParcels + staleOrders + failed + payment + closing > 0) {
    const oldest = tickets.rows[0]?.oldest;
    const ageHours = oldest ? Math.max(0, Math.floor((now.getTime() - new Date(String(oldest)).getTime()) / 3_600_000)) : 0;
    const lines = [
      "<b>Daily Admin summary</b>", `Awaiting payment >24h: ${pending}`,
      `Open tickets: ${open}`, `In-progress tickets: ${progress}`,
      `Oldest active ticket: ${Math.floor(ageHours / 24)}d ${ageHours % 24}h`,
      `Parcels with stale tracking: ${staleParcels}`, `Orders with stale tracking: ${staleOrders}`,
      `Bot failures (24h): ${failed}`,
      ...errors.slice(0, 10).map(row => `• ${count(row.count)} × ${esc(safeError(String(row.error)))}`),
      ...(errors.length > 10 ? [`Other errors: ${errors.slice(10).reduce((sum, row) => sum + count(row.count), 0)}`] : []),
      `Payment reminders (24h): ${payment}`, `Closing reminders (24h): ${closing}`,
    ];
    text = lines.join("\n");
  }
  if (!await claimTelegramReminder("admin_daily_summary", day, chatId)) return false;
  const base = telegramAppUrl();
  const result = await sendTelegramMessageFull(chatId, text, "HTML", { recipientType: "admin" }, {
    reply_markup: { inline_keyboard: [
      [{ text: "Orders", url: `${base}/admin#orders` }, { text: "Payments", url: `${base}/admin#payments` }],
      [{ text: "Tickets", url: `${base}/admin#tickets` }, { text: "Dashboard", url: `${base}/admin#dashboard` }],
    ] },
  });
  await sleep(300);
  return result.ok;
}
export function registerDailyAdminSummaryScheduler(): void {
  if (!process.env["PUBLIC_URL"]) return;
  registerScheduler({ name: "telegram-daily-admin-summary", label: "Daily Telegram Admin summary",
    description: "Counts-only summary at 08:00 Europe/London, once per day; controlled by telegramDailySummaryEnabled.",
    defaultIntervalMs: 60_000, minIntervalMs: 60_000, maxIntervalMs: 60_000, initialDelayMs: 5_000,
    run: async () => { await runDailyAdminSummary(); } });
}
