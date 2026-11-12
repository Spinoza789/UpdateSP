import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({ rows: {} as Record<string, any[]>, claimed: false, send: vi.fn() }));
vi.mock("@workspace/db", async original => ({
  ...await original<typeof import("@workspace/db")>(),
  db: { select: () => {
    let table = "";
    const q: any = { from: (t: any) => { table = getTableName(t); return q; },
      where: () => q, limit: () => q, then: (r: any) => Promise.resolve(state.rows[table] ?? []).then(r) };
    return q;
  } },
}));
vi.mock("./telegram-reminders", () => ({
  telegramAppUrl: () => "https://example.test",
  claimTelegramReminder: async () => { if (state.claimed) return false; state.claimed = true; return true; },
}));
vi.mock("./telegram", () => ({
  getTemplate: async () => ({ enabled: true, template: "Delivered {{code}}" }),
  renderTemplate: (t: string, vars: Record<string,string>) => t.replace("{{code}}", vars.code),
  notifyUserFull: state.send,
}));
import { deliveryStatusKeyboard, getDeliveryTicketContext, notifyOrderDelivered } from "./telegram-delivery-support";
describe("delivery support shortcuts", () => {
  beforeEach(() => { vi.stubEnv("PUBLIC_URL", "https://example.test"); state.rows = {}; state.claimed = false;
    state.send.mockReset().mockResolvedValue({ ok: true }); });
  it("adds a problem button only when a group parcel is delivered", () => {
    expect(deliveryStatusKeyboard("p1", "in_transit").inline_keyboard).toHaveLength(1);
    expect(deliveryStatusKeyboard("p1", "delivered").inline_keyboard[1][0].callback_data).toBe("tc:parcel:p1");
  });
  it("notifies an individual order once, only on first delivered transition", async () => {
    const order = { id: "o1", code: "<99) & more", telegramUsername: "member" };
    expect(await notifyOrderDelivered(order, "in_transit", "out_for_delivery")).toBe(false);
    expect(await notifyOrderDelivered(order, "in_transit", "delivered")).toBe(true);
    expect(await notifyOrderDelivered(order, "in_transit", "delivered")).toBe(false);
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.send.mock.calls[0][2]).toContain("&lt;99) &amp; more");
    expect(state.send.mock.calls[0][3].inline_keyboard[0][0].callback_data).toBe("tc:order:o1");
  });
  it("refuses someone else's order and prepares an owned wholesale order", async () => {
    state.rows.orders = [{ id: "o1", telegramUsername: "other", orderType: "wholesale", deletedAt: null }];
    expect(await getDeliveryTicketContext("member", "order", "o1")).toBeNull();
    state.rows.orders[0].telegramUsername = "@Member";
    expect(await getDeliveryTicketContext("member", "order", "o1")).toMatchObject({
      category: "wholesale", issueType: "order_issue", orderId: "o1", step: "awaiting_subject",
    });
  });
  it("refuses a parcel without any owned order", async () => {
    state.rows.gb_parcels = [{ id: "p1", groupBuyId: "gb1" }];
    expect(await getDeliveryTicketContext("member", "parcel", "p1")).toBeNull();
  });
});
