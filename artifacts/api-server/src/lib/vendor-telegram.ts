import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import {
  db, siteConfigTable, vendorSubmissionsTable, vendorTelegramChatsTable, vendorTelegramEventsTable, vendorTelegramLinkTokensTable, vendorTelegramLogTable,
  type VendorTelegramPrefs,
} from "@workspace/db";
import { getVendors } from "../routes/config";
import { inspectVendorSubmission, isVendorSubmissionStale, rowFollowingSource } from "./vendor-portal-service";
import { createAlert } from "./create-alert";
import { sendAdminMessage } from "./telegram";
import { VendorPortalError } from "./vendor-portal-model";
import { registerScheduler } from "./scheduler-registry";
import { pushVendorNotification, pruneNotifications } from "./vendor-notifications";

/* ---------------------------------------------------------------------------
 * Vendor Telegram bot.
 *
 * A separate bot from the member bot: vendors are not members, and a vendor
 * usually wants a whole packing-team group chat subscribed, not one person.
 * Token: VENDOR_TELEGRAM_BOT_TOKEN env var, or the vendorTelegramBotToken site
 * config key. Alerts are driven by a poller keyed on vendor_telegram_events so
 * each (kind, submission) is sent at most once, even across restarts.
 * ------------------------------------------------------------------------- */

type Executor = any;
export type EventKind = "new_order" | "hold" | "overdue" | "overdue_critical" | "issue_resolved" | "message" | "test";
export const PREF_KEYS = ["newOrders", "holds", "overdue", "issues", "messages"] as const;
const PREF_FOR_KIND: Record<EventKind, keyof VendorTelegramPrefs | null> = { new_order: "newOrders", hold: "holds", overdue: "overdue", overdue_critical: "overdue", issue_resolved: "issues", message: "messages", test: null };
const CRITICAL_OVERDUE_HOURS = 96;
const OVERDUE_HOURS = 48;
/** Staff are told once when a shipment has gone this long without being shipped. */
export const ADMIN_UNSHIPPED_HOURS = 96;
const ADMIN_UNSHIPPED_KIND = "admin_unshipped";
/** True while the shipment, read together with its Salt&Peps order, still needs shipping. */
async function stillUnshipped(row: any): Promise<boolean> {
  try {
    const { source } = await inspectVendorSubmission(db, row);
    return ["Submitted", "Processing"].includes(rowFollowingSource(row, source).status);
  } catch { return true; }
}
/** Text of the one message staff get per run, however many shipments crossed the line. */
export function adminUnshippedMessage(rows: Array<{ reference: string; vendorName: string; submittedAt: Date | string }>, now = new Date()) {
  const days = (row: { submittedAt: Date | string }) => Math.floor((now.getTime() - new Date(row.submittedAt).getTime()) / 86_400_000);
  const shown = rows.slice(0, 15).map(row => `• #${esc(row.reference)} · ${esc(row.vendorName)} · ${days(row)} days`);
  const more = rows.length > shown.length ? `\n…and ${rows.length - shown.length} more` : "";
  return `📦 <b>${rows.length} order${rows.length === 1 ? "" : "s"} not shipped after ${ADMIN_UNSHIPPED_HOURS / 24} days</b>\n${shown.join("\n")}${more}\n\nOpen the Peps Anonymous admin → Orders to chase the vendor or mark them fulfilled.`;
}
/** Tells staff, once per shipment, about anything still unshipped after four days. */
async function notifyAdminUnshipped(open: any[], now: Date, failures: string[]) {
  const cutoff = now.getTime() - ADMIN_UNSHIPPED_HOURS * 3_600_000;
  const old = open.filter((row: any) => new Date(row.submittedAt).getTime() < cutoff);
  const done = await handledIds(ADMIN_UNSHIPPED_KIND as EventKind, old.map((row: any) => row.id));
  const due: any[] = [];
  for (const row of old) {
    if (done.has(row.id) || !(await stillUnshipped(row))) continue;
    // Insert first: a duplicate key means another run already reported it.
    const inserted = await db.insert(vendorTelegramEventsTable).values({ id: randomUUID(), kind: ADMIN_UNSHIPPED_KIND, submissionId: row.id, vendorId: row.vendorId })
      .onConflictDoNothing().returning({ id: vendorTelegramEventsTable.id });
    if (inserted.length) due.push(row);
  }
  if (!due.length) return;
  const vendors = await getVendors().catch(() => []);
  const rows = due.map(row => ({ reference: row.reference as string, submittedAt: row.submittedAt, vendorName: vendors.find(v => v.id === row.vendorId)?.name ?? row.vendorId }))
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const title = `${rows.length} vendor order${rows.length === 1 ? "" : "s"} not shipped after ${ADMIN_UNSHIPPED_HOURS / 24} days`;
  const summary = rows.slice(0, 15).map(row => `#${row.reference} (${row.vendorName})`).join(", ") + (rows.length > 15 ? ` and ${rows.length - 15} more` : "");
  await createAlert("order", "high", title, summary, { linkUrl: "#vendor-portal" }).catch(e => failures.push(`admin alert: ${e instanceof Error ? e.message : e}`));
  await sendAdminMessage(adminUnshippedMessage(rows, now)).catch(e => failures.push(`admin message: ${e instanceof Error ? e.message : e}`));
}
const LINK_TTL_MS = 15 * 60_000;

/* ---- Transport (injectable for tests) ------------------------------------ */
export type TelegramTransport = (method: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; result?: any; description?: string }>;
let transport: TelegramTransport | null = null;
export function setVendorTelegramTransport(next: TelegramTransport | null) { transport = next; }

let tokenCache: { token: string; loadedAt: number } | null = null;
export async function getVendorBotToken(): Promise<string> {
  const env = process.env["VENDOR_TELEGRAM_BOT_TOKEN"]?.trim();
  if (env) return env;
  if (tokenCache && Date.now() - tokenCache.loadedAt < 60_000) return tokenCache.token;
  try {
    const [row] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "vendorTelegramBotToken"));
    tokenCache = { token: (row?.value ?? "").trim(), loadedAt: Date.now() };
  } catch { tokenCache = { token: "", loadedAt: Date.now() }; }
  return tokenCache.token;
}
async function api(method: string, payload: Record<string, unknown>) {
  if (transport) return transport(method, payload);
  const token = await getVendorBotToken();
  if (!token) return { ok: false, description: "Vendor bot token is not configured." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal,
    });
    return await res.json() as { ok: boolean; result?: any; description?: string };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : "Telegram request failed" };
  } finally { clearTimeout(timer); }
}

let botUsername: { value: string | null; loadedAt: number } | null = null;
export async function getVendorBotUsername(): Promise<string | null> {
  const env = process.env["VENDOR_TELEGRAM_BOT_USERNAME"]?.trim();
  if (env) return env.replace(/^@/, "");
  if (botUsername && Date.now() - botUsername.loadedAt < 5 * 60_000) return botUsername.value;
  const me = await api("getMe", {});
  botUsername = { value: me.ok ? me.result?.username ?? null : null, loadedAt: Date.now() };
  return botUsername.value;
}
export function vendorWebhookSecret(token: string) {
  return createHash("sha256").update(`vendor-webhook:${token}`).digest("hex").slice(0, 48);
}
export async function registerVendorWebhook(publicUrl: string): Promise<boolean> {
  const token = await getVendorBotToken();
  if (!token) return false;
  const host = publicUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const result = await api("setWebhook", { url: `https://${host}/api/vendor-telegram/webhook`, secret_token: vendorWebhookSecret(token), allowed_updates: ["message", "my_chat_member"] });
  return !!result.ok;
}
export async function vendorBotStatus() {
  const token = await getVendorBotToken();
  if (!token) return { configured: false, botUsername: null as string | null, webhookUrl: null as string | null };
  const [username, hook] = await Promise.all([getVendorBotUsername(), api("getWebhookInfo", {})]);
  return { configured: true, botUsername: username, webhookUrl: hook.ok ? (hook.result?.url ?? null) : null };
}

/* ---- Message formatting (pure) ------------------------------------------ */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const publicHost = () => (process.env["PUBLIC_URL"] ?? "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
export function portalOrderUrl(submissionId: string): string | null {
  const host = publicHost();
  return host ? `https://${host}/vendor?order=${encodeURIComponent(submissionId)}` : null;
}
export function portalThreadUrl(threadId: string): string | null {
  const host = publicHost();
  return host ? `https://${host}/vendor?thread=${encodeURIComponent(threadId)}` : null;
}
export function orderSummaryLine(row: { reference: string; snapshot: any }) {
  const items: any[] = row.snapshot?.items ?? [];
  const units = items.reduce((a, i) => a + Number(i.quantity || 0), 0);
  const country = row.snapshot?.shipping?.country ?? "";
  return `#${esc(row.reference)} · ${units} unit${units === 1 ? "" : "s"} · ${esc(country)} · ${esc(row.snapshot?.currency ?? "USD")} ${esc(row.snapshot?.totalCost ?? "")}`;
}
export function formatEvent(kind: EventKind, row: { id: string; reference: string; snapshot: any; submittedAt?: Date | string }, extra: { note?: string | null; label?: string | null } = {}) {
  const line = orderSummaryLine(row);
  const items: any[] = row.snapshot?.items ?? [];
  const list = items.slice(0, 8).map(i => `• ${esc(i.productName)} × ${esc(i.quantity)}`).join("\n") + (items.length > 8 ? `\n• …and ${items.length - 8} more` : "");
  switch (kind) {
    case "new_order": return `📦 <b>New shipment assigned</b>\n${line}\n${list}\n\nOpen the vendor portal to start packing.`;
    case "hold": return `⏸ <b>Order changed by Peps Anonymous</b>\n${line}\n\nThis shipment is on hold until it is resubmitted. Do not pack it yet.`;
    case "overdue": return `⏰ <b>Waiting ${OVERDUE_HOURS}h+ without tracking</b>\n${line}\n\nPlease add tracking or report a problem in the portal.`;
    case "overdue_critical": return `🚨 <b>${CRITICAL_OVERDUE_HOURS}h+ without tracking</b>\n${line}\n\nThe customer is waiting. Add tracking now or report a problem so Peps Anonymous can step in.`;
    case "issue_resolved": return `✅ <b>Peps Anonymous answered your problem report</b>\n${line}\n${extra.label ? `<i>${esc(extra.label)}</i>\n` : ""}${extra.note ? `\n${esc(extra.note)}` : "\nMarked as resolved."}`;
    case "message": return `💬 <b>Message from Peps Anonymous</b>\n${line}`;
    case "test": return `👋 Test message from the Peps Anonymous vendor portal. Alerts for new shipments will arrive here.`;
  }
}
export function normalizePrefs(input: unknown): VendorTelegramPrefs {
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const prefs: VendorTelegramPrefs = {};
  for (const key of PREF_KEYS) if (typeof b[key] === "boolean") prefs[key] = b[key] as boolean;
  return prefs;
}
export const prefEnabled = (prefs: VendorTelegramPrefs | null | undefined, kind: EventKind) => {
  const key = PREF_FOR_KIND[kind];
  return !key || prefs?.[key] !== false;
};

/* ---- Chats and link tokens ----------------------------------------------- */
export function publicChat(row: any) {
  return { id: row.id, chatId: row.chatId, chatType: row.chatType ?? null, title: row.title ?? null, linkedBy: row.linkedBy, prefs: row.prefs ?? {}, createdAt: row.createdAt };
}
export async function vendorChats(tx: Executor, vendorId: string) {
  return tx.select().from(vendorTelegramChatsTable).where(eq(vendorTelegramChatsTable.vendorId, vendorId)).orderBy(desc(vendorTelegramChatsTable.createdAt));
}
export async function allChats(tx: Executor) {
  return tx.select().from(vendorTelegramChatsTable).orderBy(desc(vendorTelegramChatsTable.createdAt));
}
export async function vendorLinkStatus(tx: Executor, vendorId: string, username: string, token: string) {
  const [row] = await tx.select({
    usedAt: vendorTelegramLinkTokensTable.usedAt, expiresAt: vendorTelegramLinkTokensTable.expiresAt,
  }).from(vendorTelegramLinkTokensTable).where(and(
    eq(vendorTelegramLinkTokensTable.token, token),
    eq(vendorTelegramLinkTokensTable.vendorId, vendorId),
    eq(vendorTelegramLinkTokensTable.username, username),
  )).limit(1);
  if (!row) throw new VendorPortalError("This connection has expired or was not found. Please connect again.", 410);
  return { connected: !!row.usedAt, expired: !row.usedAt && new Date(row.expiresAt).getTime() <= Date.now() };
}

export async function createLinkToken(tx: Executor, vendorId: string, username: string) {
  const token = randomBytes(12).toString("hex");
  await tx.delete(vendorTelegramLinkTokensTable).where(and(eq(vendorTelegramLinkTokensTable.username, username), isNull(vendorTelegramLinkTokensTable.usedAt)));
  await tx.insert(vendorTelegramLinkTokensTable).values({ token, vendorId, username, expiresAt: new Date(Date.now() + LINK_TTL_MS) });
  const bot = await getVendorBotUsername();
  return { token, expiresAt: new Date(Date.now() + LINK_TTL_MS), botUsername: bot, url: bot ? `https://t.me/${bot}?start=${token}` : null };
}
/** Called from the webhook when a chat sends `/start <token>`. Re-linking a chat moves it to the new vendor. */
export async function completeLink(tx: Executor, token: string, chat: { id: string | number; type?: string; title?: string; username?: string; first_name?: string }) {
  const [row] = await tx.select().from(vendorTelegramLinkTokensTable).where(eq(vendorTelegramLinkTokensTable.token, token)).for("update");
  if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now()) throw new VendorPortalError("This link code has expired. Generate a new one in the vendor portal.", 410);
  const vendor = (await getVendors()).find(v => v.id === row.vendorId);
  if (!vendor) throw new VendorPortalError("Vendor no longer exists.", 404);
  const title = chat.title ?? ([chat.first_name, chat.username ? `@${chat.username}` : ""].filter(Boolean).join(" ") || null);
  const values = { vendorId: row.vendorId, chatType: chat.type ?? null, title, linkedBy: row.username, updatedAt: new Date() };
  await tx.insert(vendorTelegramChatsTable).values({ id: randomUUID(), chatId: String(chat.id), ...values })
    .onConflictDoUpdate({ target: vendorTelegramChatsTable.chatId, set: values });
  await tx.update(vendorTelegramLinkTokensTable).set({ usedAt: new Date() }).where(eq(vendorTelegramLinkTokensTable.token, token));
  return { vendorId: vendor.id, vendorName: vendor.name };
}
export async function unlinkChat(tx: Executor, chatId: string, vendorId?: string) {
  const where = vendorId ? and(eq(vendorTelegramChatsTable.chatId, chatId), eq(vendorTelegramChatsTable.vendorId, vendorId)) : eq(vendorTelegramChatsTable.chatId, chatId);
  const rows = await tx.delete(vendorTelegramChatsTable).where(where).returning({ id: vendorTelegramChatsTable.id });
  return rows.length;
}
export async function updateChatPrefs(tx: Executor, vendorId: string, id: string, prefs: VendorTelegramPrefs) {
  const [row] = await tx.update(vendorTelegramChatsTable).set({ prefs, updatedAt: new Date() })
    .where(and(eq(vendorTelegramChatsTable.id, id), eq(vendorTelegramChatsTable.vendorId, vendorId))).returning();
  if (!row) throw new VendorPortalError("Chat not found.", 404);
  return row;
}
export async function chatVendor(tx: Executor, chatId: string) {
  const [row] = await tx.select().from(vendorTelegramChatsTable).where(eq(vendorTelegramChatsTable.chatId, chatId));
  return row ?? null;
}

/* ---- Send log ------------------------------------------------------------ */
let logTableReady: Promise<void> | null = null;
/** Mirrors vendorTelegramLogTable. Lets the log work on a database that has not been schema-pushed yet. */
function ensureLogTable(): Promise<void> {
  if (logTableReady) return logTableReady;
  const ready: Promise<void> = db.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_telegram_log(id text PRIMARY KEY, vendor_id text, chat_id text NOT NULL, chat_title text, kind text,
      body text NOT NULL, button_url text, ok boolean NOT NULL, error text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS vendor_telegram_log_vendor_created_idx ON vendor_telegram_log(vendor_id, created_at);
    CREATE INDEX IF NOT EXISTS vendor_telegram_log_created_idx ON vendor_telegram_log(created_at);
  `).then(() => undefined, (error: unknown) => { logTableReady = null; throw error; });
  logTableReady = ready;
  return ready;
}
export type VendorSendMeta = { kind?: string; vendorId?: string; chatTitle?: string | null };
/** Best effort: a logging problem must never stop or fail a vendor alert. */
async function logSend(chatId: string, html: string, buttonUrl: string | null | undefined, result: { ok: boolean; description?: string }, meta: VendorSendMeta) {
  if (transport) return; // Test transport: nothing was really sent.
  try {
    await ensureLogTable();
    const chat = meta.vendorId && meta.chatTitle !== undefined ? null : await chatVendor(db, chatId).catch(() => null);
    await db.insert(vendorTelegramLogTable).values({
      id: randomUUID(), vendorId: meta.vendorId ?? chat?.vendorId ?? null, chatId, chatTitle: meta.chatTitle ?? chat?.title ?? null,
      kind: meta.kind ?? null, body: html.slice(0, 4096), buttonUrl: buttonUrl ?? null, ok: !!result.ok,
      error: result.ok ? null : String(result.description ?? "Telegram did not accept the message").slice(0, 500),
    });
  } catch (error) {
    console.error("[vendor-telegram] could not record send log:", error instanceof Error ? error.message : "unknown error");
  }
}
export async function vendorTelegramLog(options: { vendorId?: string; failedOnly?: boolean; before?: Date; limit?: number } = {}) {
  await ensureLogTable();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const where = and(
    options.vendorId ? eq(vendorTelegramLogTable.vendorId, options.vendorId) : undefined,
    options.failedOnly ? eq(vendorTelegramLogTable.ok, false) : undefined,
    options.before ? lt(vendorTelegramLogTable.createdAt, options.before) : undefined,
  );
  const rows = await db.select().from(vendorTelegramLogTable).where(where).orderBy(desc(vendorTelegramLogTable.createdAt), desc(vendorTelegramLogTable.id)).limit(limit + 1);
  return { entries: rows.slice(0, limit), hasMore: rows.length > limit };
}

/* ---- Sending ------------------------------------------------------------- */
export async function sendToChatFull(chatId: string, html: string, buttonUrl?: string | null, buttonText = "Open in vendor portal", replyToMessageId?: string | number | null, meta: VendorSendMeta = {}) {
  const payload: Record<string, unknown> = { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true };
  if (buttonUrl) payload.reply_markup = { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] };
  if (replyToMessageId != null) payload.reply_parameters = { message_id: Number(replyToMessageId), allow_sending_without_reply: true };
  const result = await api("sendMessage", payload);
  if (!result.ok) console.error("[vendor-telegram] sendMessage failed:", result.description);
  await logSend(chatId, html, buttonUrl, result, meta);
  return { ok: !!result.ok, messageId: result.ok ? (result.result?.message_id as number | undefined) ?? null : null };
}
export async function sendToChat(chatId: string, html: string, buttonUrl?: string | null, buttonText = "Open in vendor portal", meta: VendorSendMeta = {}) {
  return (await sendToChatFull(chatId, html, buttonUrl, buttonText, null, meta)).ok;
}
/** Sends to every linked chat of the vendor that has not muted this kind. Returns how many deliveries succeeded. */
export async function notifyVendor(vendorId: string, kind: EventKind, html: string, buttonUrl?: string | null) {
  const chats = await vendorChats(db, vendorId);
  let delivered = 0;
  for (const chat of chats) {
    if (!prefEnabled(chat.prefs, kind)) continue;
    if (await sendToChat(chat.chatId, html, buttonUrl, undefined, { kind, vendorId, chatTitle: chat.title ?? null })) delivered++;
  }
  return delivered;
}

/* ---- Poller -------------------------------------------------------------- */
let running = false;
let lastFailure: string | null = null;
const NOTIFICATION_TITLES: Partial<Record<EventKind, (ref: string) => { title: string; body: string }>> = {
  new_order: ref => ({ title: `New shipment #${ref}`, body: "Assigned to you. Open it to start packing." }),
  hold: ref => ({ title: `Order #${ref} put on hold`, body: "Peps Anonymous changed this order. Do not pack it until it is resubmitted." }),
  overdue: ref => ({ title: `#${ref} has waited ${OVERDUE_HOURS}h without tracking`, body: "Add tracking or report a problem." }),
  overdue_critical: ref => ({ title: `#${ref} is ${CRITICAL_OVERDUE_HOURS}h+ overdue`, body: "The customer is waiting. Add tracking now or report a problem." }),
};
async function recordAndSend(kind: EventKind, row: any) {
  // Insert first: a duplicate key means another run already handled it.
  const inserted = await db.insert(vendorTelegramEventsTable).values({ id: randomUUID(), kind, submissionId: row.id, vendorId: row.vendorId })
    .onConflictDoNothing().returning({ id: vendorTelegramEventsTable.id });
  if (!inserted.length) return;
  const note = NOTIFICATION_TITLES[kind]?.(row.reference);
  if (note) await pushVendorNotification(db, { vendorId: row.vendorId, kind, ...note, link: `?order=${encodeURIComponent(row.id)}`, submissionId: row.id, dedupeKey: `${kind}:${row.id}` }).catch(() => null);
  const delivered = await notifyVendor(row.vendorId, kind, formatEvent(kind, row), portalOrderUrl(row.id));
  if (delivered) await db.update(vendorTelegramEventsTable).set({ delivered }).where(eq(vendorTelegramEventsTable.id, inserted[0].id));
}
async function handledIds(kind: EventKind, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await db.select({ submissionId: vendorTelegramEventsTable.submissionId }).from(vendorTelegramEventsTable)
    .where(and(eq(vendorTelegramEventsTable.kind, kind), inArray(vendorTelegramEventsTable.submissionId, ids)));
  return new Set(rows.map((r: any) => r.submissionId));
}
/** Finds new, overdue and held shipments that have not been announced yet and announces them. */
export async function notifyVendorEvents(now = new Date(), options: { vendorIds?: string[] } = {}) {
  if (running) return;
  running = true;
  const failures: string[] = [];
  try {
    const scope = options.vendorIds?.length ? and(notInArray(vendorSubmissionsTable.status, ["Shipped"]), inArray(vendorSubmissionsTable.vendorId, options.vendorIds)) : notInArray(vendorSubmissionsTable.status, ["Shipped"]);
    const open = await db.select().from(vendorSubmissionsTable).where(scope).orderBy(desc(vendorSubmissionsTable.submittedAt)).limit(300);
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const fresh = open.filter((r: any) => new Date(r.submittedAt).getTime() > dayAgo.getTime());
    const overdueCutoff = new Date(now.getTime() - OVERDUE_HOURS * 3_600_000);
    const late = open.filter((r: any) => new Date(r.submittedAt).getTime() < overdueCutoff.getTime());
    const criticalCutoff = new Date(now.getTime() - CRITICAL_OVERDUE_HOURS * 3_600_000);
    const veryLate = open.filter((r: any) => new Date(r.submittedAt).getTime() < criticalCutoff.getTime());
    const [doneNew, doneLate, doneHold, doneCritical] = await Promise.all([
      handledIds("new_order", fresh.map((r: any) => r.id)), handledIds("overdue", late.map((r: any) => r.id)), handledIds("hold", open.map((r: any) => r.id)),
      handledIds("overdue_critical", veryLate.map((r: any) => r.id)),
    ]);
    for (const row of fresh) if (!doneNew.has(row.id)) await recordAndSend("new_order", row).catch(e => failures.push(`new ${row.reference}: ${e instanceof Error ? e.message : e}`));
    for (const row of open) {
      if (doneHold.has(row.id)) continue;
      let stale = false;
      try { stale = await isVendorSubmissionStale(db, row); } catch { continue; }
      if (stale) await recordAndSend("hold", row).catch(e => failures.push(`hold ${row.reference}: ${e instanceof Error ? e.message : e}`));
    }
    for (const row of late) {
      // Shipped or moved on in the Salt&Peps admin: nothing to chase the vendor for.
      if (doneLate.has(row.id) || doneHold.has(row.id) || !(await stillUnshipped(row))) continue;
      await recordAndSend("overdue", row).catch(e => failures.push(`overdue ${row.reference}: ${e instanceof Error ? e.message : e}`));
    }
    for (const row of veryLate) {
      if (doneCritical.has(row.id) || doneHold.has(row.id) || !(await stillUnshipped(row))) continue;
      await recordAndSend("overdue_critical", row).catch(e => failures.push(`critical ${row.reference}: ${e instanceof Error ? e.message : e}`));
    }
    await notifyAdminUnshipped(open, now, failures).catch(e => failures.push(`admin unshipped: ${e instanceof Error ? e.message : e}`));
    await pruneNotifications(db).catch(() => undefined);
    lastFailure = failures.join("; ") || null;
    if (lastFailure) throw new Error(lastFailure);
  } finally { running = false; }
}
export function registerVendorTelegramScheduler() {
  registerScheduler({
    name: "vendor-telegram-alerts", label: "Vendor Telegram alerts",
    description: "Tell vendors on their own Telegram bot about new shipments, holds and orders waiting too long for tracking.",
    defaultIntervalMs: 60_000, minIntervalMs: 30_000, maxIntervalMs: 600_000, initialDelayMs: 15_000,
    run: () => notifyVendorEvents(),
    channelStatus: () => ({ alertError: lastFailure, alertRunning: running }),
  });
  const publicUrl = process.env["PUBLIC_URL"] ?? "";
  if (publicUrl) {
    registerVendorWebhook(publicUrl).then(ok => console.log(ok ? "[vendor-telegram] Webhook registered" : "[vendor-telegram] Webhook not registered (token missing or Telegram refused)"))
      .catch(error => console.error("[vendor-telegram] Webhook registration failed:", error));
  } else console.log("[vendor-telegram] Skipping webhook registration — PUBLIC_URL not set (dev environment).");
}
export async function expireLinkTokens(tx: Executor = db) {
  await tx.delete(vendorTelegramLinkTokensTable).where(lt(vendorTelegramLinkTokensTable.expiresAt, new Date(Date.now() - 86_400_000)));
}
/** Open shipments for a chat's vendor, used by the /orders command. */
export async function openOrdersSummary(tx: Executor, vendorId: string) {
  const rows = await tx.select().from(vendorSubmissionsTable)
    .where(and(eq(vendorSubmissionsTable.vendorId, vendorId), notInArray(vendorSubmissionsTable.status, ["Shipped"]), gt(vendorSubmissionsTable.submittedAt, new Date(Date.now() - 90 * 86_400_000))))
    .orderBy(desc(vendorSubmissionsTable.submittedAt)).limit(15);
  if (!rows.length) return "✅ Nothing waiting on you. New shipments will be announced here.";
  const overdueCutoff = Date.now() - OVERDUE_HOURS * 3_600_000;
  return `📋 <b>${rows.length} open shipment${rows.length === 1 ? "" : "s"}</b>\n` + rows.map((r: any) =>
    `${new Date(r.submittedAt).getTime() < overdueCutoff ? "⏰" : r.status === "Processing" ? "🔧" : "🆕"} ${orderSummaryLine(r)}`).join("\n");
}
