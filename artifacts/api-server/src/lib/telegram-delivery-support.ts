import { db, ordersTable, gbParcelsTable, groupBuysTable, orderLineItemsTable } from "@workspace/db";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { notifyUserFull, getTemplate, renderTemplate } from "./telegram";
import { claimTelegramReminder, telegramAppUrl } from "./telegram-reminders";
import { escapeTelegramHtml as esc } from "./telegram-package-tracking";
import { projectMemberParcels, parcelUsernameKey } from "./member-gb-parcels";
import { loadMemberParcelRouting } from "./member-parcel-routing-service";

export function deliveryStatusKeyboard(parcelId: string, status: string) {
  const inline_keyboard: { text: string; url?: string; callback_data?: string }[][] = [[
    { text: "📦 Check status", callback_data: `ps:${parcelId}` },
    { text: "🌐 Track on site", url: `${telegramAppUrl()}/track/parcel/${encodeURIComponent(parcelId)}` },
  ]];
  if (status === "delivered") inline_keyboard.push([{ text: "Something wrong?", callback_data: `tc:parcel:${parcelId}` }]);
  return { inline_keyboard };
}

export async function notifyOrderDelivered(
  order: { id: string; code: string; telegramUsername: string | null },
  oldStatus: string | null, status: string | null,
): Promise<boolean> {
  if (!process.env["PUBLIC_URL"] || status !== "delivered" || oldStatus === "delivered" || !order.telegramUsername) return false;
  const { enabled, template } = await getTemplate("customer_order_delivered");
  if (!enabled || !await claimTelegramReminder("delivered", order.id, order.telegramUsername)) return false;
  const result = await notifyUserFull(order.telegramUsername, "status",
    renderTemplate(template, { code: esc(order.code) }),
    { inline_keyboard: [[{ text: "Something wrong?", callback_data: `tc:order:${order.id}` }]] },
    { eventKey: "customer_order_delivered", suppressPreferenceDisabledLog: true });
  return result.ok;
}

export async function getDeliveryTicketContext(username: string, kind: "order" | "parcel", id: string) {
  const norm = parcelUsernameKey(username);
  const owns = sql`regexp_replace(lower(${ordersTable.telegramUsername}),'^@','') = ${norm}`;
  if (kind === "order") {
    const [order] = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.id, id), owns, isNull(ordersTable.deletedAt))).limit(1);
    if (!order || order.deletedAt || parcelUsernameKey(order.telegramUsername) !== norm) return null;
    return { step: "awaiting_subject" as const,
      category: order.orderType === "wholesale" || order.orderType === "wholesale_shared" ? "wholesale" : "group_buy",
      issueType: "order_issue", orderId: order.id, groupBuyId: order.groupBuyId ?? undefined };
  }
  const [parcel] = await db.select().from(gbParcelsTable).where(eq(gbParcelsTable.id, id)).limit(1);
  if (!parcel) return null;
  const owned = (await db.select().from(ordersTable).where(and(owns,
    eq(ordersTable.groupBuyId, parcel.groupBuyId), isNull(ordersTable.deletedAt),
    inArray(ordersTable.paymentStatus, ["confirmed", "test_confirmed"]))))
    .filter(order => parcelUsernameKey(order.telegramUsername) === norm && !order.deletedAt);
  if (!owned.length) return null;
  const lines = await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, owned.map(o => o.id)));
  const routing = await loadMemberParcelRouting(parcel.groupBuyId, owned);
  if (!projectMemberParcels([parcel], routing.orders, lines, routing.usernames).some(p => p.id === parcel.id)) return null;
  const [group] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, parcel.groupBuyId));
  return { step: "awaiting_subject" as const, category: "group_buy", issueType: "order_issue",
    groupBuyId: parcel.groupBuyId, groupBuyName: group?.name, orderId: owned.length === 1 ? owned[0].id : undefined };
}
