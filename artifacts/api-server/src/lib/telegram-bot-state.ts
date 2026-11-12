import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { registerScheduler } from "./scheduler-registry";

type BotStateKind = "ticket" | "feedback" | "ai_usage" | "used_token";

export async function getBotState<T>(chatId: string, kind: BotStateKind, ttlMs: number): Promise<T | null> {
  const result = await db.execute(sql`
    SELECT state FROM telegram_bot_state WHERE chat_id = ${chatId} AND kind = ${kind}
      AND updated_at > now() - ${ttlMs} * interval '1 millisecond'
  `);
  return (result.rows[0]?.state as T | undefined) ?? null;
}

export async function setBotState(chatId: string, kind: BotStateKind, state: unknown): Promise<void> {
  await db.execute(sql`
    INSERT INTO telegram_bot_state (chat_id, kind, state) VALUES (${chatId}, ${kind}, ${JSON.stringify(state)}::jsonb)
    ON CONFLICT (chat_id, kind) DO UPDATE SET state = EXCLUDED.state, updated_at = now()
  `);
}

export async function clearBotState(chatId: string, kind: BotStateKind): Promise<void> {
  await db.execute(sql`DELETE FROM telegram_bot_state WHERE chat_id = ${chatId} AND kind = ${kind}`);
}

export async function incrementBotAiUsage(chatId: string): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO telegram_bot_state (chat_id, kind, state) VALUES (${chatId}, 'ai_usage', '{"count":1}'::jsonb)
    ON CONFLICT (chat_id, kind) DO UPDATE SET
      state = CASE WHEN telegram_bot_state.updated_at <= now() - interval '24 hours'
        THEN '{"count":1}'::jsonb
        ELSE jsonb_build_object('count', (telegram_bot_state.state->>'count')::int + 1) END,
      updated_at = CASE WHEN telegram_bot_state.updated_at <= now() - interval '24 hours'
        THEN now() ELSE telegram_bot_state.updated_at END
    RETURNING state
  `);
  return (result.rows[0]?.state as { count: number }).count;
}

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
      await db.execute(sql`DELETE FROM telegram_bot_state WHERE
        (kind IN ('ticket', 'feedback') AND updated_at <= now() - interval '10 minutes') OR
        (kind = 'used_token' AND updated_at <= now() - interval '20 minutes') OR
        (kind = 'ai_usage' AND updated_at <= now() - interval '24 hours')`);
    },
  });
}
