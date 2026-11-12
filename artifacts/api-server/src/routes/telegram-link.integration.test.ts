import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const state = vi.hoisted(() => ({
  account: null as any,
  completionFails: false,
  expireAfterInitialLookup: false,
  completedUsernames: [] as string[],
  sentMessages: [] as string[],
  updates: new Set<number>(),
  rows: {} as Record<string, any[]>,
  payloads: [] as any[],
  otherAccounts: [] as string[],
  botStates: new Map<string, unknown>(),
  filters: [] as string[],
  adminChat: null as string | null,
  statusChanges: [] as string[],
  mediaReads: 0,
  ticketWrites: [] as any[],
}));

function makeDb(root: boolean, accountBox: { value: any }): any {
  return {
    execute: async (query: any) => {
      const compiled = new PgDialect().sqlToQuery(query);
      if (compiled.sql.includes("telegram_bot_state")) {
        const [chat, kind, value] = compiled.params;
        const key = `${chat}:${kind}`;
        if (compiled.sql.includes("INSERT")) state.botStates.set(key, JSON.parse(value as string));
        if (compiled.sql.includes("DELETE")) state.botStates.delete(key);
        return { rows: state.botStates.has(key) ? [{ state: state.botStates.get(key) }] : [] };
      }
      if (!compiled.sql.includes("telegram_processed_updates")) return { rows: [] };
      const id = compiled.params[0] as number;
      if (state.updates.has(id)) return { rows: [] };
      state.updates.add(id);
      return { rows: [{ update_id: id }] };
    },
    select: () => {
      let table = "";
      const query: any = {
        from(value: unknown) { table = getTableName(value as never); return query; },
        where(filter?: any) { if (filter) state.filters.push(new PgDialect().sqlToQuery(filter).sql); return query; },
        leftJoin() { return query; },
        orderBy() { return query; },
        limit() { return query; },
        for() {
          // Model a concurrent wait on the row lock: the initial token lookup was
          // valid, but the authoritative locked row has expired by the time it is read.
          if (table === "accounts" && state.expireAfterInitialLookup && accountBox.value) {
            accountBox.value.telegramLinkExpiresAt = new Date(Date.now() - 1);
          }
          return query;
        },
        then(resolve: (rows: any[]) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(table === "accounts" && accountBox.value ? [accountBox.value] : state.rows[table] ?? [])
            .then(resolve, reject);
        },
      };
      return query;
    },
    update(table: unknown) {
      const tableName = getTableName(table as never);
      return {
        set(patch: Record<string, unknown>) {
          return {
            where: () => {
              if (tableName === "accounts" && Object.keys(patch).length === 1 && patch.telegramChatId === null) {
                return { returning: async () => state.otherAccounts.map(telegramUsername => ({ telegramUsername })) };
              }
              if (tableName === "accounts" && accountBox.value) Object.assign(accountBox.value, patch);
              return Promise.resolve();
            },
            returning: async () => {
              if (tableName === "accounts" && accountBox.value) {
                Object.assign(accountBox.value, patch);
                return [accountBox.value];
              }
              return [];
            },
          };
        },
      };
    },
    insert: () => ({ values: () => {
      const value: any = Promise.resolve();
      value.returning = async () => [{ id: 42 }];
      return value;
    } }),
    async transaction(callback: (tx: any) => Promise<unknown>) {
      if (!root) return callback(this);
      const staged = { value: structuredClone(accountBox.value) };
      const result = await callback(makeDb(false, staged));
      accountBox.value = staged.value;
      state.account = staged.value;
      return result;
    },
  };
}

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const box = {
    get value() { return state.account; },
    set value(value: any) { state.account = value; },
  };
  return {
    ...actual,
    db: makeDb(true, box),
    pool: { query: async () => ({ rows: [] }) },
  };
});
vi.mock("../lib/account-verification", () => ({
  completeAccountVerificationInTransaction: async (tx: any, username: string) => {
    state.completedUsernames.push(username);
    await tx.update({ [Symbol.for("drizzle:Name")]: "accounts" } as any)
      .set({ verifiedAt: new Date(), verificationMethod: "telegram" }).where();
    if (state.completionFails) throw new Error("verification completion failed");
    return true;
  },
}));
vi.mock("../lib/telegram", () => ({
  webhookSecretMatches: async (value: unknown) => value === "test-webhook-secret",
  sendTelegramMessage: async (_chatId: string, message: string) => {
    state.sentMessages.push(message);
    return { ok: true };
  },
  sendTelegramMessageFull: async (_chat: string, message: string, _mode?: string, _ctx?: any, payload?: any) => {
    state.sentMessages.push(message); state.payloads.push(payload); return { ok: true };
  },
  sendTelegramPhoto: async () => ({ ok: true }),
  sendAdminTicketNotification: async () => ({ ok: true }),
  answerCallbackQuery: async () => undefined,
  getBotUsername: async () => "test_bot",
  getAdminChatId: async () => state.adminChat,
  notifyUserTicket: async () => undefined,
  getTemplate: async (key: string) => ({ template: key === "bot_link_success" ? "Linked {{username}}" : key }),
  renderTemplate: (template: string, values: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? ""),
}));
vi.mock("../lib/ticket-status", () => ({
  changeTicketStatus: async (id: string, status: string) => {
    state.statusChanges.push(`${id}:${status}`);
    return { id, status, subject: "Help <99) & more", changed: true };
  },
}));
vi.mock("../lib/telegram-ticket-media", async original => ({
  ...await original<typeof import("../lib/telegram-ticket-media")>(),
  readTelegramTicketImage: async () => {
    state.mediaReads++;
    return { buffer: Buffer.from("image"), originalName: "photo.jpg", reportedMimeType: "image/jpeg" };
  },
}));
vi.mock("../lib/ticket-message-attachments", () => ({
  persistCustomerTicketMessage: async (input: any) => {
    state.ticketWrites.push(input);
    if (input.newTicket) state.rows.tickets = [input.newTicket];
    return 42;
  },
}));
vi.mock("../lib/audit-log", () => ({ writeLog: async () => undefined }));
vi.mock("../lib/google-genai", () => ({ GoogleGenAI: class {} }));
vi.mock("../lib/sage-ai", () => ({ callSageAI: async () => "" }));
vi.mock("../lib/translate-zh", () => ({ translateZh: async (text: string) => text }));
vi.mock("../lib/tracking-auto-refresh", () => ({
  refreshSingleGbParcel: async () => undefined,
  fetchTrackingEventsForNumber: async () => [],
}));
vi.mock("../lib/wholesale-share-chat", () => ({ postWholesaleChatMessage: async () => undefined }));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (_req: any, res: any) => res.status(401).end(),
  requireAccountIdentity: (_req: any, res: any) => res.status(401).end(),
  issueAccountCookieForAccount: async () => undefined,
}));

import telegramRouter from "./telegram";

async function webhook(text: string, authenticated = true, updateId = Math.floor(Math.random() * 1_000_000_000), callback?: string, messageOverride: any = {}) {
  const app = express();
  app.use(express.json());
  app.use(telegramRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}/telegram/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authenticated ? { "x-telegram-bot-api-secret-token": "test-webhook-secret" } : {}) },
      body: JSON.stringify(callback
        ? { update_id: updateId, callback_query: { id: "cb", data: callback, message: { chat: { id: 98765 } } } }
        : { update_id: updateId, message: { text, chat: { id: 98765, username: "telegram-user", type: "private" }, ...messageOverride } }),
    });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("mounted Telegram account linking", () => {
  it("rejects webhook requests without the secret header", async () => {
    expect((await webhook("/link", false)).status).toBe(401);
  });
  beforeEach(() => {
    state.updates.clear();
    state.rows = {};
    state.payloads.length = 0;
    state.otherAccounts = [];
    state.botStates.clear();
    state.filters.length = 0;
    state.adminChat = null;
    state.statusChanges.length = 0;
    state.mediaReads = 0;
    state.ticketWrites.length = 0;
    state.account = {
      telegramUsername: "Stored_UserName",
      telegramLinkToken: "ABCDEF12",
      telegramLinkExpiresAt: new Date(Date.now() + 60_000),
      telegramChatId: null,
      verifiedAt: null,
      verificationRequiredAt: new Date(),
    };
    state.completionFails = false;
    state.expireAfterInitialLookup = false;
    state.completedUsernames.length = 0;
    state.sentMessages.length = 0;
  });

  it.each(["/link ABCDEF12", "/start ABCDEF12"])(
    "rolls back chat binding and token consumption when completion fails for %s",
    async (text) => {
      state.completionFails = true;
      const failed = await webhook(text);
      expect(failed.status).toBe(200);
      expect(state.account.telegramChatId).toBeNull();
      expect(state.account.telegramLinkToken).toBe("ABCDEF12");
      expect(state.account.verifiedAt).toBeNull();

      state.completionFails = false;
      const retried = await webhook(text);
      expect(retried.status).toBe(200);
      expect(state.account.telegramChatId).toBe("98765");
      expect(state.account.telegramLinkToken).toBeNull();
    },
  );

  it("uses the exact stored username when completing and acknowledging a successful link", async () => {
    const response = await webhook("/link ABCDEF12");
    expect(response.status).toBe(200);
    expect(state.completedUsernames).toEqual(["Stored_UserName"]);
    expect(state.sentMessages).toContain("Linked Stored_UserName");
  });

  it("does not bind or consume a token that expires while waiting for the account lock", async () => {
    state.expireAfterInitialLookup = true;
    const response = await webhook("/link ABCDEF12");
    expect(response.status).toBe(200);
    expect(state.account.telegramChatId).toBeNull();
    expect(state.account.telegramLinkToken).toBe("ABCDEF12");
    expect(state.account.verifiedAt).toBeNull();
    expect(state.completedUsernames).toEqual([]);
  });
  it("handles an update ID only once", async () => {
    await webhook("/link ABCDEF12", true, 123);
    await webhook("/link ABCDEF12", true, 123);
    expect(state.completedUsernames).toEqual(["Stored_UserName"]);
  });
  it("escapes product names, group names and admin messages in order details", async () => {
    state.rows.orders = [{
      id: "order-1", code: "123", status: "Submitted", paymentStatus: "unpaid",
      grandTotal: "40", gbName: "GB & <99)", adminMessage: "<99) & message",
      orderType: "wholesale", groupBuyId: null,
    }];
    state.rows.order_line_items = [{ productName: "Oxytocin 10mg (<99) & water", quantity: "1" }];
    await webhook("", true, 321, "mn:order:123");
    expect(state.sentMessages.join("\n")).toContain("Oxytocin 10mg (&lt;99) &amp; water");
    expect(state.sentMessages.join("\n")).toContain("GB &amp; &lt;99)");
  });
  it("escapes ticket subjects in the guided confirmation", async () => {
    await webhook("/support");
    await webhook("", true, 322, "tc:cat:wholesale");
    await webhook("", true, 323, "tc:ws:general");
    await webhook("Missing <99) & water");
    await webhook("Please help with this missing item");
    expect(state.sentMessages.join("\n")).toContain("Support ticket opened");
    expect(state.sentMessages.join("\n")).toContain("Missing &lt;99) &amp; water");
  });
  it("offers ordering for active group buys and not closed/draft/archived ones", async () => {
    state.rows.account_group_buys = ["active", "closed", "draft", "archived"].map(status => ({ groupBuyId: status }));
    state.rows.group_buys = ["active", "closed", "draft", "archived"].map(status => ({ id: status, name: status, status }));
    await webhook("", true, 324, "mn:gbs");
    const buttons = state.payloads.flatMap(payload => payload?.reply_markup?.inline_keyboard?.flat() ?? []);
    expect(buttons.filter(button => button.web_app).map(button => button.text)).toEqual(["🟢 active"]);
  });
  it.each(["ps_pending:gb", "ps_all:gb"])("uses the linked account without a public Telegram username for %s", async callback => {
    await webhook("", true, 400, callback);
    expect(state.sentMessages).not.toContain("Could not identify your Telegram account.");
    expect(state.sentMessages.length).toBeGreaterThan(0);
  });
  it.each(["/link ABCDEF12", "/start ABCDEF12"])("reports other accounts unlinked by %s", async text => {
    state.otherAccounts = ["old_account", "another_account"];
    await webhook(text);
    expect(state.sentMessages.join("\n")).toContain("This Telegram was unlinked from: @old_account, @another_account");
  });
  it.each(["video", "voice", "sticker"])("explains how to send an unsupported private %s", async kind => {
    await webhook("", true, 410, undefined, { text: undefined, [kind]: {} });
    expect(state.sentMessages).toContain("I can only read text messages here. Please type your message, or add photos and files to your ticket on the website.");
    expect(state.payloads.at(-1)?.reply_markup.inline_keyboard[0][0].url).toContain("/account?s=support");
  });
  it("requires a ticket before accepting a private photo caption", async () => {
    await webhook("", true, 411, undefined, { text: undefined, photo: [{}], caption: "/support" });
    expect(state.sentMessages.join("\n")).toContain("bot_ticket_media_guidance");
  });
  it("refuses ticket media from an unlinked chat", async () => {
    state.account = null;
    await webhook("", true, 413, undefined, { text: undefined, photo: [{ file_id: "file" }] });
    expect(state.sentMessages).toContain("bot_ticket_media_link_required");
    expect(state.mediaReads).toBe(0);
  });
  it("routes a photo reply to its owned ticket with the no-caption placeholder", async () => {
    state.rows.ticket_telegram_messages = [{ ticketId: "t1" }];
    state.rows.tickets = [{ id: "t1", accountUsername: "Stored_UserName", subject: "Help", status: "open" }];
    await webhook("", true, 414, undefined, { text: undefined, photo: [{ file_id: "file" }], reply_to_message: { message_id: 9 } });
    expect(state.ticketWrites[0]).toMatchObject({ ticketId: "t1", username: "Stored_UserName", body: "(photo attached)" });
    expect(state.ticketWrites[0].image.originalName).toBe("photo.jpg");
  });
  it("refuses another account's tracked ticket before downloading", async () => {
    state.rows.ticket_telegram_messages = [{ ticketId: "t1" }];
    state.rows.tickets = [{ id: "t1", accountUsername: "other", status: "open" }];
    await webhook("", true, 415, undefined, { text: undefined, photo: [{ file_id: "file" }], reply_to_message: { message_id: 9 } });
    expect(state.mediaReads).toBe(0);
    expect(state.ticketWrites).toEqual([]);
    expect(state.sentMessages).toContain("bot_ticket_media_unavailable");
  });
  it("creates one ticket for an album and saves subsequent photos as separate messages", async () => {
    state.botStates.set("98765:ticket", { step: "awaiting_body", category: "wholesale", subject: "Missing item", ts: Date.now() });
    const image = { text: undefined, photo: [{ file_id: "file" }], media_group_id: "album1", caption: "Photo evidence" };
    await Promise.all([webhook("", true, 416, undefined, image), webhook("", true, 417, undefined, image)]);
    expect(state.ticketWrites).toHaveLength(2);
    expect(state.ticketWrites.filter(row => row.newTicket)).toHaveLength(1);
    expect(state.ticketWrites[1].ticketId).toBe(state.ticketWrites[0].ticketId);
    expect(state.ticketWrites[1].body).toBe("Photo evidence");
  });
  it("ignores media and captions in group chats", async () => {
    await webhook("", true, 412, undefined, { text: undefined, photo: [{}], caption: "/support", chat: { id: -123, type: "supergroup" } });
    expect(state.sentMessages).toEqual([]);
  });
  it.each(["/Start", "/menu@SaltPepsBot", "/STOP"])("normalizes the command word in %s", async text => {
    state.account.telegramChatId = "98765";
    await webhook(text);
    if (text === "/STOP") {
      expect(state.account.telegramChatId).toBeNull();
      expect(state.sentMessages).toContain("bot_unlinked");
    } else {
      expect(state.sentMessages.join("\n")).toContain("bot_menu_header");
    }
  });
  it("labels test-confirmed orders paid and excludes deleted orders", async () => {
    state.rows.orders = [{ code: "123", status: "Submitted", paymentStatus: "test_confirmed", grandTotal: "40" }];
    await webhook("", true, 420, "mn:orders");
    expect(state.filters.join("\n")).toContain('"orders"."deleted_at" is null');
    const buttons = state.payloads.flatMap(payload => payload?.reply_markup?.inline_keyboard?.flat() ?? []);
    const orderButton = buttons.find(button => button.callback_data === "mn:order:123");
    expect(orderButton.text).toContain("✅ Paid");
    expect(orderButton.text).not.toContain("— ·");
  });
  it("guides untracked admin replies and identifies closed tickets", async () => {
    state.adminChat = "98765";
    await webhook("An untracked reply");
    expect(state.sentMessages).toContain("To reply to a ticket, use Reply on the ticket message.");
    state.rows.ticket_telegram_messages = [{ ticketId: "ticket1" }];
    state.rows.tickets = [{ id: "ticket1", status: "closed" }];
    await webhook("Reply text", true, 421, undefined, { reply_to_message: { message_id: 9 } });
    expect(state.sentMessages).toContain("That ticket is closed.");
  });
  it("allows resolve/close callbacks only from the configured admin chat", async () => {
    state.adminChat = "another-admin";
    await webhook("", true, 430, "adm:tk:res:t1");
    expect(state.statusChanges).toEqual([]);
    state.adminChat = "98765";
    await webhook("", true, 431, "adm:tk:res:t1");
    await webhook("", true, 432, "adm:tk:cls:t1");
    expect(state.statusChanges).toEqual(["t1:resolved", "t1:closed"]);
  });
});