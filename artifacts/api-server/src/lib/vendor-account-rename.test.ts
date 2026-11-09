import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
vi.mock("@workspace/db", async () => ({ ...await import("@workspace/db/schema"), db: { transaction: vi.fn() } }));
import { db, vendorAccountsTable, vendorSessionsTable, vendorMfaChallengesTable, vendorTelegramLinkTokensTable, vendorTelegramChatsTable, vendorEmailSettingsTable, vendorEmailDeliveriesTable, vendorTotpTable, vendorPasskeysTable, vendorAuditTable } from "@workspace/db";
import { vendorAccountStore } from "./vendor-account-store";

describe("vendor username transaction", () => {
  const current = { username: "oldvendor", passwordHash: "expected-hash", status: "active", vendorId: "supplier", companyName: "Keep Company" };
  let selects: any[], operations: { type: string; table: unknown; value?: unknown }[];
  beforeEach(() => {
    selects = [[current], []]; operations = [];
    const tx: any = {
      select: () => {
        const rows = selects.shift();
        return { from: () => ({ where: () => ({ for: async () => rows, then: (resolve: any) => Promise.resolve(rows).then(resolve) }) }) };
      },
      delete: (table: unknown) => ({ where: async () => { operations.push({ type: "delete", table }); } }),
      update: (table: unknown) => ({ set: (value: unknown) => ({ where: () => {
        operations.push({ type: "update", table, value });
        return { returning: async () => [{ ...current, username: "newvendor" }], then: (resolve: any) => Promise.resolve([]).then(resolve) };
      } }) }),
      insert: (table: unknown) => ({ values: async (value: unknown) => { operations.push({ type: "insert", table, value }); } }),
    };
    vi.mocked(db.transaction).mockImplementation(async callback => callback(tx));
  });
  it("keeps supplier identity, clears sessions and pending challenges, migrates chat ownership and records an audit", async () => {
    expect(await vendorAccountStore.renameAccount("oldvendor", "newvendor", "expected-hash")).toMatchObject({ username: "newvendor", vendorId: "supplier", companyName: "Keep Company" });
    expect(operations.filter(op => op.type === "delete").map(op => op.table)).toEqual([vendorSessionsTable, vendorMfaChallengesTable, vendorTelegramLinkTokensTable]);
    expect(operations.find(op => op.table === vendorTelegramChatsTable)?.value).toEqual({ linkedBy: "newvendor" });
    expect(operations.find(op => op.table === vendorEmailSettingsTable)?.value).toEqual({ pendingEmail: null, codeHash: null, expiresAt: null, attempts: 0 });
    expect(operations.find(op => op.table === vendorAccountsTable)?.value).toMatchObject({ username: "newvendor" });
    expect(operations.find(op => op.table === vendorAuditTable)?.value).toMatchObject({ actor: "newvendor", action: "vendor_username_changed", details: { previousUsername: "oldvendor", username: "newvendor", vendorId: "supplier" } });
  });
  it("has update cascades for MFA methods and verified email settings and delivery history", () => {
    for (const table of [vendorTotpTable, vendorPasskeysTable, vendorEmailSettingsTable, vendorEmailDeliveriesTable]) {
      const fk = getTableConfig(table).foreignKeys.find(key => key.reference().foreignTable === vendorAccountsTable);
      expect(fk?.onUpdate).toBe("cascade");
    }
  });
  it("does not mutate anything after a competing password change or unavailable username", async () => {
    expect(await vendorAccountStore.renameAccount("oldvendor", "newvendor", "stale-hash")).toBeNull();
    expect(operations).toEqual([]);
    selects = [[current], [{ username: "newvendor" }]];
    expect(await vendorAccountStore.renameAccount("oldvendor", "newvendor", "expected-hash")).toBeNull();
    expect(operations).toEqual([]);
  });
  it("handles a concurrent unique collision without masking other database failures", async () => {
    vi.mocked(db.transaction).mockRejectedValueOnce({ cause: { code: "23505" } });
    expect(await vendorAccountStore.renameAccount("oldvendor", "newvendor", "expected-hash")).toBeNull();
    vi.mocked(db.transaction).mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(vendorAccountStore.renameAccount("oldvendor", "newvendor", "expected-hash")).rejects.toThrow("Database unavailable");
  });
});
