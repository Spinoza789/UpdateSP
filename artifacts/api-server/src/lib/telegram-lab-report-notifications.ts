import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getTemplate, renderTemplate, notifyUserFull } from "./telegram";
import { claimTelegramReminder, telegramAppUrl, telegramJobDelay } from "./telegram-reminders";
import { escapeTelegramHtml as esc } from "./telegram-package-tracking";
import { registerScheduler } from "./scheduler-registry";

interface PublishedReportRecipient {
  id: number; groupId: string; groupName: string; reportName: string; username: string; chatId: string | null;
  pending: boolean; paymentStatus: string; deletedAt: Date | null; preferences: { status?: boolean } | null; url: string | null;
}
/** Only public lab_tests records enter this worker. Private COA certificates are never queried. */
export async function runLabReportNotifications({ sleep = telegramJobDelay } = {}): Promise<number> {
  if (!process.env["PUBLIC_URL"]) return 0;
  const { enabled, template } = await getTemplate("customer_lab_report_published");
  if (!enabled) return 0;
  const result = await db.execute(sql`SELECT DISTINCT lab.id, lab.group_buy_id AS "groupId", gb.name AS "groupName",
    lab.peptide_name AS "reportName", lab.url, lab.pending, a.telegram_username AS username,
    a.telegram_chat_id AS "chatId", a.telegram_notifications AS preferences,
    o.payment_status AS "paymentStatus", o.deleted_at AS "deletedAt"
    FROM lab_tests lab JOIN group_buys gb ON gb.id = lab.group_buy_id
    JOIN orders o ON o.group_buy_id = lab.group_buy_id
    JOIN accounts a ON lower(a.telegram_username) = regexp_replace(lower(o.telegram_username),'^@','')
    WHERE NOT lab.pending AND o.deleted_at IS NULL AND o.payment_status IN ('confirmed','test_confirmed')
      AND a.telegram_chat_id IS NOT NULL AND a.telegram_chat_id <> ''
      AND COALESCE((a.telegram_notifications->>'status')::boolean, true)
      AND NOT EXISTS (SELECT 1 FROM telegram_reminders_sent r WHERE r.kind = 'lab_report'
        AND r.ref_id = lab.id::text AND r.username = lower(a.telegram_username))
    ORDER BY lab.id, username LIMIT 200`);
  let sent = 0, attempts = 0;
  for (const row of result.rows as unknown as PublishedReportRecipient[]) {
    if (attempts >= 200) break;
    if (row.pending || !row.groupId || !row.chatId || row.deletedAt || row.preferences?.status === false
      || !["confirmed", "test_confirmed"].includes(row.paymentStatus)) continue;
    if (!await claimTelegramReminder("lab_report", String(row.id), row.username)) continue;
    attempts++;
    try {
      let url = `${telegramAppUrl()}/api/lab-tests/${encodeURIComponent(row.id)}/preview`;
      try { if (row.url && ["https:", "http:"].includes(new URL(row.url).protocol)) url = row.url; } catch { /* use the public report preview */ }
      const result = await notifyUserFull(row.username, "status",
        renderTemplate(template, { gb_name: esc(row.groupName), report_name: esc(row.reportName) }),
        { inline_keyboard: [[{ text: "View report", url }]] },
        { eventKey: "customer_lab_report_published", suppressPreferenceDisabledLog: true });
      if (result.ok) sent++;
    } catch (error) { console.error("[telegram-lab-reports] Notification failed", row.id, error); }
    await sleep(300);
  }
  return sent;
}
export function registerLabReportNotificationScheduler(): void {
  if (!process.env["PUBLIC_URL"]) return;
  registerScheduler({ name: "telegram-lab-report-notifications", label: "Public group-buy lab reports",
    description: "Notify paid members when a public report explicitly linked to their group buy is available.",
    defaultIntervalMs: 300_000, minIntervalMs: 300_000, maxIntervalMs: 300_000, initialDelayMs: 120_000,
    run: async () => { await runLabReportNotifications(); } });
}
