import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { registerScheduler } from "./scheduler-registry";

export async function claimTelegramUpdate(updateId: unknown): Promise<boolean> {
  if (!Number.isSafeInteger(updateId)) return false;
  const result = await db.execute(sql`
    INSERT INTO telegram_processed_updates (update_id) VALUES (${updateId})
    ON CONFLICT DO NOTHING RETURNING update_id
  `);
  return result.rows.length > 0;
}

export function registerTelegramCleanupScheduler(): void {
  registerScheduler({
    name: "telegram-bot-cleanup",
    label: "Telegram bot cleanup",
    description: "Remove old Telegram update receipts and expired conversation state.",
    defaultIntervalMs: 86_400_000, minIntervalMs: 86_400_000, maxIntervalMs: 86_400_000,
    initialDelayMs: 60_000,
    run: async () => {
      await db.execute(sql`DELETE FROM telegram_processed_updates WHERE created_at < now() - interval '2 days'`);
    },
  });
}
