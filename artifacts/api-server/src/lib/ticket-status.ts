import { db, ticketsTable, type TicketStatus } from "@workspace/db";
import { eq } from "drizzle-orm";
import { notifyUserTicket, getTemplate, renderTemplate } from "./telegram";
import { escapeTelegramHtml } from "./telegram-package-tracking";

/** Both Admin entry points use the same row lock, idempotence and notification path. */
export async function changeTicketStatus(id: string, status: TicketStatus) {
  const result = await db.transaction(async tx => {
    const [ticket] = await tx.select().from(ticketsTable).where(eq(ticketsTable.id, id)).for("update");
    if (!ticket) return null;
    if (ticket.status === status) return { ...ticket, changed: false };
    const updatedAt = new Date();
    await tx.update(ticketsTable).set({ status, updatedAt, customerUnread: true }).where(eq(ticketsTable.id, id));
    return { ...ticket, status, updatedAt, changed: true };
  });
  if (result?.changed) {
    const { enabled, template } = await getTemplate("customer_ticket_status_changed");
    if (enabled) await notifyUserTicket(result.accountUsername, result.id,
      renderTemplate(template, { subject: escapeTelegramHtml(result.subject), status: escapeTelegramHtml(result.status.replace(/_/g, " ")) }));
  }
  return result;
}
