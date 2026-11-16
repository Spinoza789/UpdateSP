import { eq, inArray } from "drizzle-orm";
import { wholesaleOrderFinancialsTable, ordersTable, orderLineItemsTable, productsTable, fs3CostsTable, vendorAuditTable } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { getVendors } from "../routes/config";
import { loadFs3CostMatches } from "./fs3-cost-matches";
import { freezeCommercialLines } from "./wholesale-financial-snapshot";

/** Call inside the order transaction, after lines are committed and parent locked. */
export async function captureWholesaleFinancials(tx: any, orderId: string, newlyCommitted = false) {
  const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || !["wholesale", "wholesale_shared"].includes(order.orderType) || order.groupBuyId) return;
  const items = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
  if (!items.length) return;
  const [previous] = await tx.select().from(wholesaleOrderFinancialsTable).where(eq(wholesaleOrderFinancialsTable.orderId, orderId)).for("update");
  // An old unsubmitted order without a cost record has no recoverable historical
  // catalogue price. Do not turn a later edit into a fabricated backfill.
  if (!previous && !newlyCommitted) return;
  const products = await tx.select().from(productsTable).where(inArray(productsTable.id, items.map((i: any) => i.productId)));
  const costs = await tx.select().from(fs3CostsTable);
  const lines = freezeCommercialLines(items, previous?.lines ?? [], products, costs, await loadFs3CostMatches(tx), await getVendors(), order.wholesaleVendorId);
  await tx.insert(wholesaleOrderFinancialsTable).values({ orderId, lines }).onConflictDoUpdate({
    target: wholesaleOrderFinancialsTable.orderId, set: { lines },
  });
  if (previous && JSON.stringify(previous.lines) !== JSON.stringify(lines)) {
    await tx.insert(vendorAuditTable).values({ id: randomUUID(), actor: "system:commercial-order",
      action: "commercial_order_revised", details: { orderId, before: previous.lines, after: lines } });
  }
}
