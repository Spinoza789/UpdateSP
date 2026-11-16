import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export type WholesaleFinancialLine = {
  productId: string; productName: string; vendorId: string | null;
  quantity: string; salesUsd: string; unitCost: string | null;
};
/** Private commercial values. Never spread into a customer/vendor response. */
export const wholesaleOrderFinancialsTable = pgTable("wholesale_order_financials", {
  orderId: text("order_id").primaryKey().references(() => ordersTable.id, { onDelete: "cascade" }),
  lines: jsonb("lines").$type<WholesaleFinancialLine[]>().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});
