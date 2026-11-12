import { pgTable, bigint, timestamp, text, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const telegramProcessedUpdatesTable = pgTable("telegram_processed_updates", {
  updateId: bigint("update_id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const telegramBotStateTable = pgTable("telegram_bot_state", {
  chatId: text("chat_id").notNull(),
  kind: text("kind").notNull(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.chatId, table.kind] })]);

export const telegramRemindersSentTable = pgTable("telegram_reminders_sent", {
  kind: text("kind").notNull(),
  refId: text("ref_id").notNull(),
  username: text("username").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.kind, table.refId, table.username] })]);
