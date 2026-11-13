import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getTemplate, renderTemplate, notifyUserFull } from "./telegram";
import { escapeTelegramHtml as esc } from "./telegram-package-tracking";
import { registerScheduler } from "./scheduler-registry";

/** Shared with getAccountSnapshot: do not broaden either eligibility condition independently. */
export function pendingPaymentSql(alias: "" | "o" = ""): string {
  const p = alias ? `${alias}.` : "";
  return `${p}status IN ('Submitted','Processing') AND ${p}payment_status NOT IN ('confirmed','test_confirmed') AND ${p}deleted_at IS NULL`;
}
export const telegramJobDelay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export const telegramAppUrl = () => (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
export async function claimTelegramReminder(kind: string, refId: string, username: string): Promise<boolean> {
  const result = await db.execute(sql`INSERT INTO telegram_reminders_sent(kind, ref_id, username)
    VALUES (${kind}, ${refId}, ${username.replace(/^@/, "").toLowerCase()})
    ON CONFLICT DO NOTHING RETURNING ref_id`);
  return result.rows.length > 0;
}
// Retired at the owner's request: no automatic unpaid-order Telegram messages,
// even if a stored template or scheduler setting still enables this old event.
// Keep inert entry points so older callers cannot restart delivery accidentally.
export async function runPaymentReminders(_options: { sleep?: typeof telegramJobDelay } = {}): Promise<number> {
  return 0;
}
export function registerPaymentReminderScheduler(): void {
  // Deliberately do not register the retired payment reminder worker.
}

interface ClosingCandidate {
  id: string; username: string; chatId: string; preferences: { reminders?: boolean } | null;
  name: string; status: string; hidden: boolean; hasOrder: boolean; closeDate: string | Date;
}
export async function runClosingReminders({ sleep = telegramJobDelay } = {}): Promise<number> {
  if (!process.env["PUBLIC_URL"]) return 0;
  const { template, enabled } = await getTemplate("customer_gb_closing_soon");
  if (!enabled) return 0;
  const result = await db.execute(sql`SELECT gb.id, gb.name, gb.status, gb.hidden_from_list AS hidden,
      gb.close_date AS "closeDate", a.telegram_username AS username, a.telegram_chat_id AS "chatId",
      a.telegram_notifications AS preferences, false AS "hasOrder"
    FROM group_buys gb JOIN account_group_buys agb ON agb.group_buy_id = gb.id
    JOIN accounts a ON a.telegram_username = agb.account_id
    WHERE gb.status = 'active' AND NOT gb.hidden_from_list
      AND gb.close_date > now() AND gb.close_date <= now() + interval '48 hours'
      AND a.telegram_chat_id IS NOT NULL AND a.telegram_chat_id <> ''
      AND COALESCE((a.telegram_notifications->>'reminders')::boolean, true)
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.group_buy_id = gb.id AND o.deleted_at IS NULL
        AND regexp_replace(lower(o.telegram_username),'^@','') = lower(a.telegram_username))
      AND NOT EXISTS (SELECT 1 FROM telegram_reminders_sent r WHERE r.kind = 'gb_closing'
        AND r.ref_id = gb.id AND r.username = lower(a.telegram_username))
    ORDER BY gb.close_date, gb.id, a.telegram_username LIMIT 200`);
  let sent = 0, attempts = 0;
  for (const row of result.rows as unknown as ClosingCandidate[]) {
    if (attempts >= 200) break;
    const remaining = new Date(row.closeDate).getTime() - Date.now();
    if (!row.chatId || row.preferences?.reminders === false || row.status !== "active"
      || row.hidden || row.hasOrder || !(remaining > 0 && remaining <= 172_800_000)) continue;
    if (!await claimTelegramReminder("gb_closing", row.id, row.username)) continue;
    attempts++;
    try {
      const date = new Date(row.closeDate).toLocaleString("en-GB", { timeZone: "Europe/London", timeZoneName: "short" });
      const text = renderTemplate(template, { gb_name: esc(row.name), closing_date: esc(date) });
      const result = await notifyUserFull(row.username, "reminders", text,
        { inline_keyboard: [[{ text: "Order now", url: `${telegramAppUrl()}/order?gbId=${encodeURIComponent(row.id)}` }]] },
        { eventKey: "customer_gb_closing_soon", suppressPreferenceDisabledLog: true });
      if (result.ok) sent++;
    } catch (error) { console.error("[telegram-reminders] Closing reminder failed", row.id, error); }
    await sleep(300);
  }
  return sent;
}
export function registerClosingReminderScheduler(): void {
  if (!process.env["PUBLIC_URL"]) return;
  registerScheduler({ name: "telegram-gb-closing-reminders", label: "Group-buy closing reminders",
    description: "One reminder for joined members who have not ordered before a visible group closes.",
    defaultIntervalMs: 21_600_000, minIntervalMs: 21_600_000, maxIntervalMs: 21_600_000,
    initialDelayMs: 90_000, run: async () => { await runClosingReminders(); } });
}
