import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({
  download: vi.fn(), store: vi.fn(), cleanup: vi.fn(), writes: [] as { table: string; value: any }[],
  ticket: { id: "t1", accountUsername: "member", subject: "Help", status: "open" } as any,
}));
vi.mock("./telegram", () => ({ downloadTelegramTicketFile: state.download }));
vi.mock("./ticket-attachments", async original => ({
  ...await original<typeof import("./ticket-attachments")>(), storeTicketImage: state.store, deleteTicketImage: state.cleanup,
}));
vi.mock("@workspace/db", async original => {
  const fake: any = {
    select: () => { const q: any = { from: () => q, where: () => q, for: () => q, then: (r: any) => Promise.resolve([state.ticket]).then(r) }; return q; },
    insert: (table: any) => ({ values: (value: any) => {
      state.writes.push({ table: getTableName(table), value });
      const promise: any = Promise.resolve(); promise.returning = async () => [{ id: 42 }]; return promise;
    } }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  };
  fake.transaction = async (work: any) => work(fake);
  return { ...await original<typeof import("@workspace/db")>(), db: fake };
});
import { readTelegramTicketImage } from "./telegram-ticket-media";
import { persistCustomerTicketMessage } from "./ticket-message-attachments";
describe("Telegram ticket images", () => {
  beforeEach(() => {
    state.writes.length = 0; state.ticket = { id: "t1", accountUsername: "member", subject: "Help", status: "open" };
    state.download.mockReset().mockResolvedValue({ buffer: Buffer.from("image"), fileName: "photo.jpg" });
    state.store.mockReset().mockResolvedValue({ storageKey: "private/key", fileName: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 5 });
    state.cleanup.mockReset().mockResolvedValue(undefined);
  });
  it("stores a photo reply against the owned ticket and its message", async () => {
    const image = await readTelegramTicketImage({ photo: [{ file_id: "small" }, { file_id: "large", file_size: 5 }] });
    await persistCustomerTicketMessage({ ticketId: "t1", username: "member", body: "(photo attached)", image });
    expect(state.download.mock.calls[0][0]).toBe("large");
    expect(state.writes.find(row => row.table === "ticket_messages")?.value).toMatchObject({ ticketId: "t1", authorUsername: "member" });
    expect(state.writes.find(row => row.table === "ticket_message_attachments")?.value[0])
      .toMatchObject({ ticketMessageId: 42, storageKey: "private/key" });
  });
  it("rejects disallowed documents and oversize media before downloading", async () => {
    await expect(readTelegramTicketImage({ document: { file_id: "bad", mime_type: "application/pdf", file_size: 5 } })).rejects.toThrow();
    await expect(readTelegramTicketImage({ photo: [{ file_id: "huge", file_size: 21 * 1024 * 1024 }] })).rejects.toThrow(/20 MB/);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("rechecks ownership and cleans an upload if the reply cannot commit", async () => {
    state.ticket.accountUsername = "other";
    await expect(persistCustomerTicketMessage({ ticketId: "t1", username: "member", body: "photo",
      image: { buffer: Buffer.from("image"), originalName: "photo.jpg", reportedMimeType: "image/jpeg" } })).rejects.toThrow(/not available/);
    expect(state.cleanup).toHaveBeenCalledWith("private/key");
    expect(state.writes).toEqual([]);
  });
});
