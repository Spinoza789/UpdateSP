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
}));

function makeDb(root: boolean, accountBox: { value: any }): any {
  return {
    execute: async (query: any) => {
      const id = new PgDialect().sqlToQuery(query).params[0] as number;
      if (state.updates.has(id)) return { rows: [] };
      state.updates.add(id);
      return { rows: [{ update_id: id }] };
    },
    select: () => {
      let table = "";
      const query: any = {
        from(value: unknown) { table = getTableName(value as never); return query; },
        where() { return query; },
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
            where: async () => {
              if (tableName === "accounts" && accountBox.value) Object.assign(accountBox.value, patch);
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
    insert: () => ({ values: async () => undefined }),
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
  getAdminChatId: async () => null,
  notifyUserTicket: async () => undefined,
  getTemplate: async (key: string) => ({ template: key === "bot_link_success" ? "Linked {{username}}" : key }),
  renderTemplate: (template: string, values: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? ""),
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

async function webhook(text: string, authenticated = true, updateId = Math.floor(Math.random() * 1_000_000_000), callback?: string) {
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
        : { update_id: updateId, message: { text, chat: { id: 98765, username: "telegram-user", type: "private" } } }),
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
});