import { sql } from "drizzle-orm";
import { GroupStockError } from "./group-buy-stock";
import type { db } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function kitFeeAmount(value: unknown): string {
  const text = typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text) || Number(text) > 99_999_999.99) {
    throw new GroupStockError("Enter a non-negative fee per kit with at most two decimal places.");
  }
  return Number(text).toFixed(2);
}

// Caller authorises and takes the group stock mutex before entering.
// This only changes group-product settings, never catalogue prices or existing orders.
export async function updateGroupKitFees(tx: Tx, groupId: string, ids: string[] | "all", fee: string) {
  const selection = ids === "all" ? sql`TRUE`
    : sql`product_id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`;
  const links = await tx.execute(sql`
    SELECT product_id AS id FROM group_buy_products
    WHERE group_buy_id = ${groupId} AND ${selection} FOR UPDATE
  `);
  if (!links.rows.length || (ids !== "all" && links.rows.length !== ids.length)) {
    throw new GroupStockError("One or more selected products are not part of this group buy.");
  }
  const result = await tx.execute(sql`
    UPDATE group_buy_products SET fee_per_kit = ${fee}::numeric
    WHERE group_buy_id = ${groupId} AND ${selection}
    RETURNING product_id AS id, fee_per_kit AS "feePerKit"
  `);
  if (result.rows.length !== links.rows.length) {
    throw new GroupStockError("Products changed during the update. Refresh and try again.", 409);
  }
  return (result.rows as Array<{ id: string; feePerKit: string }>).map(row => ({
    id: row.id, feePerKit: Number(row.feePerKit),
  }));
}
