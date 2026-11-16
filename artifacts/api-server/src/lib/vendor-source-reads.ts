import { and, inArray } from "drizzle-orm";
import { ordersTable, orderLineItemsTable, wholesaleSharesTable, wholesaleShareMembersTable, productsTable } from "@workspace/db";
import { getVendors } from "../routes/config";
import { refundMutationPredicate } from "./refund-mutation-guard";

/** One request's read-only source data. Never reused by writes or across requests. */
export async function preloadVendorSources(tx: any, submissions: any[]) {
  const keys: string[] = submissions.map(row => row.sourceKey.split(":vendor:")[0]);
  const shareIds = [...new Set(keys.filter(key => key.startsWith("share:")).map(key => key.slice(6)))];
  const shares: any[] = shareIds.length ? await tx.select().from(wholesaleSharesTable).where(inArray(wholesaleSharesTable.id, shareIds)) : [];
  const members: any[] = shareIds.length ? await tx.select().from(wholesaleShareMembersTable).where(inArray(wholesaleShareMembersTable.shareId, shareIds)) : [];
  const ids = [...new Set<string>([
    ...submissions.flatMap(row => row.orderIds ?? []),
    ...keys.filter(key => key.startsWith("order:")).map(key => key.slice(6)),
    ...members.map(member => member.orderId).filter(Boolean),
  ])];
  const orders: any[] = ids.length ? await tx.select().from(ordersTable).where(inArray(ordersTable.id, ids)) : [];
  const mutable: any[] = ids.length ? await tx.select({ id: ordersTable.id }).from(ordersTable)
    .where(and(inArray(ordersTable.id, ids), refundMutationPredicate())) : [];
  const items: any[] = ids.length ? await tx.select({
    productId: orderLineItemsTable.productId, productName: orderLineItemsTable.productName,
    quantity: orderLineItemsTable.quantity, vendorId: orderLineItemsTable.vendorId, orderId: orderLineItemsTable.orderId,
    lineTotal: orderLineItemsTable.lineTotal,
  }).from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, ids)) : [];
  const productIds = [...new Set<string>(items.map(item => item.productId).filter(Boolean))];
  const products: any[] = productIds.length ? await tx.select().from(productsTable).where(inArray(productsTable.id, productIds)) : [];
  const byOrder = new Map<string, any[]>();
  for (const item of items) {
    if (!byOrder.has(item.orderId)) byOrder.set(item.orderId, []);
    byOrder.get(item.orderId)!.push(item);
  }
  const byShare = new Map<string, any[]>();
  for (const member of members) {
    if (!byShare.has(member.shareId)) byShare.set(member.shareId, []);
    byShare.get(member.shareId)!.push(member);
  }
  return { orders: new Map(orders.map(order => [order.id, order])), items: byOrder,
    shares: new Map(shares.map(share => [share.id, share])), members: byShare,
    products: new Map(products.map(product => [product.id, product])),
    mutable: new Set(mutable.map(order => order.id)), vendors: await getVendors() };
}
export type VendorSourceReads = Awaited<ReturnType<typeof preloadVendorSources>>;
