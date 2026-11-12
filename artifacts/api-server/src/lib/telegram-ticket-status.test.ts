import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ ticket: null as any, notify: vi.fn(), updates: [] as any[] }));
vi.mock("@workspace/db", async original => {
  const fake: any = {
    select: () => { const q: any = { from: () => q, where: () => q, for: () => q,
      then: (r: any) => Promise.resolve(state.ticket ? [state.ticket] : []).then(r) }; return q; },
    update: () => ({ set: (patch: any) => ({ where: async () => { state.updates.push(patch); Object.assign(state.ticket, patch); } }) }),
  };
  fake.transaction = async (fn: any) => fn(fake);
  return { ...await original<typeof import("@workspace/db")>(), db: fake };
});
vi.mock("./telegram", () => ({
  notifyUserTicket: state.notify,
  getTemplate: async () => ({ enabled: true, template: "{{subject}} {{status}}" }),
  renderTemplate: (t: string, vars: Record<string,string>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ""),
}));
import { changeTicketStatus } from "./ticket-status";
describe("shared website and Telegram ticket status changes", () => {
  beforeEach(() => {
    state.ticket = { id: "t1", accountUsername: "member", subject: "Help <99) & more", status: "open", updatedAt: new Date() };
    state.notify.mockReset().mockResolvedValue(undefined); state.updates.length = 0;
  });
  it.each(["resolved", "closed"] as const)("changes to %s and notifies the member once", async status => {
    expect(await changeTicketStatus("t1", status)).toMatchObject({ changed: true, status });
    expect(await changeTicketStatus("t1", status)).toMatchObject({ changed: false, status });
    expect(state.updates).toHaveLength(1);
    expect(state.notify).toHaveBeenCalledTimes(1);
    expect(state.notify.mock.calls[0][2]).toContain("&lt;99) &amp; more");
  });
  it("returns null for a missing ticket", async () => {
    state.ticket = null;
    expect(await changeTicketStatus("missing", "closed")).toBeNull();
    expect(state.notify).not.toHaveBeenCalled();
  });
});
