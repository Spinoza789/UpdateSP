import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";

const state = vi.hoisted(() => ({ tx: null as any, lookup: vi.fn() }));
vi.mock("@workspace/db", async () => {
  const real = await vi.importActual<any>("@workspace/db");
  return { ...real, db: { select: (...args: any[]) => state.tx.select(...args) } };
});
const auth = vi.hoisted(() => (req: any, res: any, next: any) => {
  const user = req.get("x-test-user");
  if (!user) return res.sendStatus(401);
  req.account = req.organiser = req.reshipper = { telegramUsername: user };
  next();
});
vi.mock("../../middleware/require-organiser", () => ({ requireOrganiser: auth }));
vi.mock("../../middleware/require-reshipper", () => ({ requireReshipper: auth }));
vi.mock("../../middleware/require-wholesale", () => ({ requireWholesale: auth }));
vi.mock("../../lib/telegram", () => ({ getLinkedTelegramUsername: state.lookup }));

describe.skipIf(process.env.VENDOR_PORTAL_DB_TESTS !== "1")("managed Telegram contacts / rollback PostgreSQL", () => {
  let store: any, db: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    db = (await vi.importActual<any>("@workspace/db")).db;
    const app = express();
    app.use((await import("../managed-telegram")).default);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(() => server?.close());
  async function fixture(run: (f: any) => Promise<void>) {
    const rollback = new Error("fixture rollback");
    await db.transaction(async (tx: any) => {
      state.tx = tx;
      state.lookup.mockReset().mockResolvedValue("ActualTelegram");
      const suffix = randomUUID().slice(0, 8);
      const owner = `owner${suffix}`, member = `member${suffix}`, other = `other${suffix}`, shipper = `ship${suffix}`;
      await tx.insert(store.accountsTable).values([
        { telegramUsername: owner }, { telegramUsername: member, telegramChatId: "1234567" },
        { telegramUsername: other }, { telegramUsername: shipper },
      ]);
      const group = randomUUID(), share = randomUUID(), order = randomUUID();
      await tx.insert(store.groupBuysTable).values({ id: group, name: "Contact fixture", organiserId: owner });
      await tx.insert(store.accountGroupBuysTable).values({ id: randomUUID(), accountId: member, groupBuyId: group });
      await tx.insert(store.gbReshippersTable).values({ id: randomUUID(), gbId: group, reshipperUsername: shipper, country: "GB", enabled: true });
      await tx.insert(store.ordersTable).values({
        id: order, code: `ct-${suffix}`, telegramUsername: member, groupBuyId: group,
        reshipperUsername: shipper, deliveryMethod: "Reshipper", productSubtotal: "10", grandTotal: "10",
      });
      await tx.insert(store.wholesaleSharesTable).values({ id: share, creatorUsername: owner, name: "Contact fixture", inviteCode: suffix });
      await tx.insert(store.wholesaleShareMembersTable).values({ id: randomUUID(), shareId: share, username: member });
      await run({ tx, owner, member, other, shipper, group, share, order });
      throw rollback;
    }).catch((error: unknown) => { if (error !== rollback) throw error; });
    state.tx = null;
  }
  async function get(path: string, user?: string) {
    const res = await fetch(base + path, { headers: user ? { "x-test-user": user } : {} });
    return { status: res.status, data: res.status === 401 ? null : await res.json() };
  }
  const paths = (f: any) => [
    { path: `/organiser/group-buys/${f.group}/members/${f.member}/telegram-profile`, user: f.owner },
    { path: `/reshipper/gb/${f.group}/members/${f.member}/telegram-profile`, user: f.shipper },
    { path: `/wholesale-shares/${f.share}/members/${f.member}/telegram-profile`, user: f.owner },
  ];
  it("automatically resolves the actual linked username in all three managed scopes without exposing chat IDs", async () => {
    await fixture(async f => {
      for (const { path, user } of paths(f)) {
        const result = await get(path, user);
        expect(result.status).toBe(200);
        expect(result.data).toEqual({ linked: true, username: "ActualTelegram" });
      }
      expect(state.lookup).toHaveBeenCalledWith("1234567");
    });
  });
  it("denies anonymous, unrelated managers and ordinary shared-order members before any bot lookup", async () => {
    await fixture(async f => {
      for (const { path } of paths(f)) {
        expect((await get(path)).status).toBe(401);
        expect((await get(path, f.other)).status).toBe(404);
        expect((await get(path, f.member)).status).toBe(404);
      }
      for (const { path, user } of paths(f)) {
        expect((await get(path.replace(`/members/${f.member}/`, `/members/${f.other}/`), user)).status).toBe(404);
      }
      expect(state.lookup).not.toHaveBeenCalled();
    });
  });
  it("revokes reshipper contact access on reassignment or disabled assignment", async () => {
    await fixture(async f => {
      const { path, user } = paths(f)[1];
      await f.tx.update(store.ordersTable).set({ reshipperUsername: f.other }).where(eq(store.ordersTable.id, f.order));
      expect((await get(path, user)).status).toBe(404);
      await f.tx.update(store.ordersTable).set({ reshipperUsername: f.shipper }).where(eq(store.ordersTable.id, f.order));
      await f.tx.update(store.gbReshippersTable).set({ enabled: false }).where(eq(store.gbReshippersTable.gbId, f.group));
      expect((await get(path, user)).status).toBe(404);
      expect(state.lookup).not.toHaveBeenCalled();
    });
  });
  it("distinguishes not linked, no public username and Telegram failure", async () => {
    await fixture(async f => {
      const { path, user } = paths(f)[0];
      state.lookup.mockResolvedValue(null);
      expect((await get(path, user)).data).toEqual({ linked: true, username: null });
      state.lookup.mockRejectedValue(new Error("upstream secret must not be exposed"));
      const failed = await get(path, user);
      expect(failed.status).toBe(502);
      expect(JSON.stringify(failed.data)).not.toContain("upstream");
      await f.tx.update(store.accountsTable).set({ telegramChatId: null }).where(eq(store.accountsTable.telegramUsername, f.member));
      expect((await get(path, user)).data).toEqual({ linked: false, username: null });
    });
  });
  it("rechecks scope and link after Telegram responds", async () => {
    await fixture(async f => {
      const { path, user } = paths(f)[0];
      state.lookup.mockImplementation(async () => {
        await f.tx.update(store.accountsTable).set({ telegramChatId: "7654321" }).where(eq(store.accountsTable.telegramUsername, f.member));
        return "OldContact";
      });
      expect((await get(path, user)).status).toBe(409);
    });
  });
  it("does not return a contact if a shared-order membership is removed during lookup", async () => {
    await fixture(async f => {
      const { path, user } = paths(f)[2];
      state.lookup.mockImplementation(async () => {
        await f.tx.delete(store.wholesaleShareMembersTable).where(eq(store.wholesaleShareMembersTable.shareId, f.share));
        return "OldContact";
      });
      const result = await get(path, user);
      expect(result.status).toBe(409);
      expect(JSON.stringify(result.data)).not.toContain("OldContact");
    });
  });
});
