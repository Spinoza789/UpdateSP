import { sql } from "drizzle-orm";
import { GroupStockError } from "./group-buy-stock";
import type { db } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function calculateGroupKitFees(
  items: ReadonlyArray<{ productId: string; quantity: string | number }>,
  rates: ReadonlyArray<{ productId: string; feePerKit: string | number | null; chargeFullFeeOnHalfKit?: boolean }>,
): number {
  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.productId,
    (quantities.get(item.productId) ?? 0) + Math.round(Number(item.quantity) * 100));
  const hundredthsOfCents = rates.reduce((sum, rate) => {
    const quantity = Math.max(0, quantities.get(rate.productId) ?? 0);
    const billable = rate.chargeFullFeeOnHalfKit ? Math.ceil(quantity / 100) * 100 : quantity;
    return sum + Math.max(0, Math.round(Number(rate.feePerKit) * 100)) * billable;
  }, 0);
  return Math.round(hundredthsOfCents / 100) / 100;
}

export function kitFeeEditLocked(order: {
  paymentStatus: string;
  kitFees: string | number;
  amountDue?: string | number;
  paymentTxHash?: string | null;
  testPaymentTxHash?: string | null;
  balanceTxHash?: string | null;
  balancePaymentStatus?: string | null;
}, nextKitFees: number): boolean {
  if (!(nextKitFees > 0 || Number(order.kitFees) > 0)) return false;
  return !["unpaid", "test_ready", "rejected", "failed"].includes(order.paymentStatus)
    || Boolean(order.paymentTxHash || order.testPaymentTxHash || order.balanceTxHash)
    || Number(order.amountDue ?? 0) > 0 || order.balancePaymentStatus === "confirmed"
    || order.balancePaymentStatus === "pending_confirmation";
}

export function kitFeeAmount(value: unknown): string {
  const text = typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text) || Number(text) > 99_999_999.99) {
    throw new GroupStockError("Enter a non-negative fee per kit with at most two decimal places.");
  }
  return Number(text).toFixed(2);
}

export function parseKitFeeSettings(body: { feePerKit?: unknown; chargeFullFeeOnHalfKit?: unknown }) {
  const feePerKit = body.feePerKit === undefined ? undefined : kitFeeAmount(body.feePerKit);
  const chargeFullFeeOnHalfKit = body.chargeFullFeeOnHalfKit;
  if (chargeFullFeeOnHalfKit !== undefined && typeof chargeFullFeeOnHalfKit !== "boolean") {
    throw new GroupStockError("Choose whether half kits pay the full kit fee.");
  }
  if (feePerKit === undefined && chargeFullFeeOnHalfKit === undefined) {
    throw new GroupStockError("Provide a kit fee or half-kit fee setting.");
  }
  return { feePerKit, chargeFullFeeOnHalfKit };
}

// Caller authorises and takes the group stock mutex before entering.
// This only changes group-product settings, never catalogue prices or existing orders.
export async function updateGroupKitFees(tx: Tx, groupId: string, ids: string[] | "all", fee: string | undefined, chargeFullFeeOnHalfKit?: boolean) {
  const changes = [];
  if (fee !== undefined) changes.push(sql`fee_per_kit = ${fee}::numeric`);
  if (chargeFullFeeOnHalfKit !== undefined) changes.push(sql`charge_full_fee_on_half_kit = ${chargeFullFeeOnHalfKit}`);
  if (!changes.length) throw new GroupStockError("Provide a kit fee or half-kit fee setting.");
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
    UPDATE group_buy_products SET ${sql.join(changes, sql`, `)}
    WHERE group_buy_id = ${groupId} AND ${selection}
    RETURNING product_id AS id, fee_per_kit AS "feePerKit", charge_full_fee_on_half_kit AS "chargeFullFeeOnHalfKit"
  `);
  if (result.rows.length !== links.rows.length) {
    throw new GroupStockError("Products changed during the update. Refresh and try again.", 409);
  }
  return (result.rows as Array<{ id: string; feePerKit: string | null; chargeFullFeeOnHalfKit: boolean }>).map(row => ({
    id: row.id, feePerKit: Number(row.feePerKit), chargeFullFeeOnHalfKit: row.chargeFullFeeOnHalfKit === true,
  }));
}
