import { createHash } from "node:crypto";

export const emailEventAllowed = (kind: string) => kind === "new_order" || kind === "message";
export interface VendorEmailItem {
  notificationId: string; username: string; recipient: string; kind: string; title: string; attempts: number;
}
export interface VendorEmailQueue {
  enqueue(): Promise<unknown>;
  pending(): Promise<VendorEmailItem[]>;
  eligible(item: VendorEmailItem): Promise<boolean>;
  finish(item: VendorEmailItem): Promise<unknown>;
  retry(item: VendorEmailItem): Promise<unknown>;
  cancel(item: VendorEmailItem): Promise<unknown>;
}
type Sender = (event: string, email: string, vars: Record<string, string>, options: { idempotencyKey: string }) => Promise<{ ok: boolean }>;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export async function deliverVendorEmails(queue: VendorEmailQueue, send: Sender) {
  await queue.enqueue();
  for (const item of await queue.pending()) {
    if (!emailEventAllowed(item.kind) || !await queue.eligible(item)) { await queue.cancel(item); continue; }
    const key = createHash("sha256").update(`${item.notificationId}:${item.username}`).digest("hex");
    let ok = false;
    try {
      ok = (await send(item.kind === "new_order" ? "vendor_new_order" : "vendor_message", item.recipient, {
        title: escape(item.title),
      }, { idempotencyKey: `vendor-email-${key}` })).ok;
    } catch { /* Retried with the same provider idempotency key. */ }
    if (ok) await queue.finish(item); else await queue.retry(item);
  }
}
