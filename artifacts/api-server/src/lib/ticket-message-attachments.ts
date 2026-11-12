import { randomUUID } from "node:crypto";
import { db, ticketsTable, ticketMessagesTable, ticketMessageAttachmentsTable, type NewTicket } from "@workspace/db";
import { eq } from "drizzle-orm";
import { storeTicketImage, deleteTicketImage, type StoredTicketImage, type TicketImageUpload } from "./ticket-attachments";
export type CustomerTicketImage = Omit<TicketImageUpload, "ticketId">;

export async function cleanupUncommittedTicketImages(images: StoredTicketImage[]): Promise<void> {
  await Promise.all(images.map(image => deleteTicketImage(image.storageKey).catch(error => {
    console.error("[tickets] Could not clean up an uncommitted image", error);
  })));
}
export async function insertTicketImageMetadata(tx: Pick<typeof db, "insert">, messageId: number, images: StoredTicketImage[]) {
  if (!images.length) return;
  await tx.insert(ticketMessageAttachmentsTable).values(images.map(image => ({
    id: randomUUID(), ticketMessageId: messageId, storageKey: image.storageKey,
    fileName: image.fileName, mimeType: image.mimeType, sizeBytes: image.sizeBytes,
  })));
}
export async function persistCustomerTicketMessage(input: {
  ticketId: string; username: string; body: string; image?: CustomerTicketImage; newTicket?: NewTicket;
}) {
  const uploaded: StoredTicketImage[] = [];
  try {
    if (input.image) uploaded.push(await storeTicketImage({ ...input.image, ticketId: input.ticketId }));
    return await db.transaction(async tx => {
      if (input.newTicket) {
        if (input.newTicket.id !== input.ticketId || input.newTicket.accountUsername !== input.username)
          throw new Error("That ticket is not available.");
        await tx.insert(ticketsTable).values(input.newTicket);
      } else {
        const [ticket] = await tx.select().from(ticketsTable).where(eq(ticketsTable.id, input.ticketId)).for("update");
        if (!ticket || ticket.accountUsername.replace(/^@/, "").toLowerCase() !== input.username.replace(/^@/, "").toLowerCase())
          throw new Error("That ticket is not available.");
        if (ticket.status === "closed") throw new Error("That ticket is closed.");
        await tx.update(ticketsTable).set({ updatedAt: new Date(), status: ticket.status === "resolved" ? "open" : ticket.status })
          .where(eq(ticketsTable.id, input.ticketId));
      }
      const [message] = await tx.insert(ticketMessagesTable).values({
        ticketId: input.ticketId, authorRole: "customer", authorUsername: input.username, body: input.body, createdAt: new Date(),
      }).returning({ id: ticketMessagesTable.id });
      await insertTicketImageMetadata(tx, message.id, uploaded);
      return message.id;
    });
  } catch (error) {
    await cleanupUncommittedTicketImages(uploaded);
    throw error;
  }
}
