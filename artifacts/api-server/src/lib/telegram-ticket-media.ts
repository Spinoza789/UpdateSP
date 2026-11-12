import { downloadTelegramTicketFile } from "./telegram";
import { MAX_TICKET_IMAGE_BYTES, validateTicketImageBatch, TicketImageValidationError } from "./ticket-attachments";
import type { CustomerTicketImage } from "./ticket-message-attachments";
// A short-lived execution queue, not conversation state. Albums remain separate messages.
const mediaQueues = new Map<string, Promise<void>>();
export async function serializeTelegramMedia(chatId: string, work: () => Promise<void>): Promise<void> {
  const previous = mediaQueues.get(chatId) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(work);
  mediaQueues.set(chatId, current);
  try { await current; } finally { if (mediaQueues.get(chatId) === current) mediaQueues.delete(chatId); }
}

export async function readTelegramTicketImage(message: {
  photo?: { file_id: string; file_size?: number }[];
  document?: { file_id: string; file_size?: number; file_name?: string; mime_type?: string };
}): Promise<CustomerTicketImage> {
  const photo = message.photo?.at(-1);
  const media = photo ?? message.document;
  if (!media?.file_id) throw new TicketImageValidationError("Choose a photo or an allowed image file.");
  const reportedMimeType = photo ? "image/jpeg" : message.document?.mime_type ?? "";
  const validation = validateTicketImageBatch([{ size: media.file_size ?? 1, reportedMimeType, detectedMimeType: reportedMimeType }]);
  if (validation) throw new TicketImageValidationError(validation);
  const downloaded = await downloadTelegramTicketFile(media.file_id, MAX_TICKET_IMAGE_BYTES);
  return { buffer: downloaded.buffer, originalName: message.document?.file_name ?? downloaded.fileName, reportedMimeType };
}
