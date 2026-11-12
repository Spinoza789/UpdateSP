import { pgTable, bigint, timestamp } from "drizzle-orm/pg-core";

export const telegramProcessedUpdatesTable = pgTable("telegram_processed_updates", {
  updateId: bigint("update_id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
