import { pgTable, text, boolean, timestamp, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { vendorAccountsTable } from "./vendor_accounts";

/** A vendor login's notification destination, separate from member/contact email. */
export const vendorEmailSettingsTable = pgTable("vendor_email_settings", {
  username: text("username").primaryKey().references(() => vendorAccountsTable.username, { onUpdate: "cascade", onDelete: "cascade" }),
  email: text("email"),
  enabled: boolean("enabled").notNull().default(false),
  newOrders: boolean("new_orders").notNull().default(true),
  messages: boolean("messages").notNull().default(true),
  newOrdersSince: timestamp("new_orders_since", { withTimezone: true }).notNull().defaultNow(),
  messagesSince: timestamp("messages_since", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  pendingEmail: text("pending_email"),
  codeHash: text("code_hash"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
});

export const vendorEmailDeliveriesTable = pgTable("vendor_email_deliveries", {
  notificationId: text("notification_id").notNull(),
  username: text("username").notNull().references(() => vendorAccountsTable.username, { onUpdate: "cascade", onDelete: "cascade" }),
  recipient: text("recipient").notNull(),
  vendorId: text("vendor_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.notificationId, t.username] }),
  index("vendor_email_deliveries_pending_idx").on(t.nextAttemptAt),
]);
