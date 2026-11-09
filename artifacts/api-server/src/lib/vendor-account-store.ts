import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, vendorAccountsTable, vendorSessionsTable, vendorTelegramChatsTable, vendorTelegramLinkTokensTable, vendorMfaChallengesTable, vendorEmailSettingsTable, vendorAuditTable } from "@workspace/db";
export type VendorAccount = typeof vendorAccountsTable.$inferSelect;
export type VendorSession = typeof vendorSessionsTable.$inferSelect;
export interface VendorAccountStore {
  getAccount(username: string): Promise<VendorAccount | null>;
  createAccount(account: VendorAccount): Promise<VendorAccount | null>;
  listAccounts(): Promise<VendorAccount[]>;
  createSession(account: VendorAccount, session: VendorSession): Promise<boolean>;
  getSession(hash: string, now: Date): Promise<{ account: VendorAccount; session: VendorSession } | null>;
  deleteSession(hash: string): Promise<void>;
  updateAccount(username: string, changes: Partial<Pick<VendorAccount, "status" | "vendorId" | "passwordHash" | "displayName">>, expectedPasswordHash?: string): Promise<VendorAccount | null>;
  renameAccount(username: string, newUsername: string, expectedPasswordHash: string): Promise<VendorAccount | null>;
}
export const vendorAccountStore: VendorAccountStore = {
  async getAccount(username) { const [row] = await db.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, username)); return row ?? null; },
  async createAccount(account) { const [row] = await db.insert(vendorAccountsTable).values(account).onConflictDoNothing().returning(); return row ?? null; },
  async listAccounts() { return db.select().from(vendorAccountsTable).orderBy(vendorAccountsTable.createdAt); },
  async createSession(account, session) {
    return db.transaction(async tx => {
      const [current] = await tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, account.username)).for("update");
      if (!current || current.passwordHash !== account.passwordHash || current.status === "disabled") return false;
      await tx.insert(vendorSessionsTable).values(session);
      return true;
    });
  },
  async getSession(hash, now) {
    const [row] = await db.select({ account: vendorAccountsTable, session: vendorSessionsTable }).from(vendorSessionsTable)
      .innerJoin(vendorAccountsTable, eq(vendorAccountsTable.username, vendorSessionsTable.username))
      .where(and(eq(vendorSessionsTable.tokenHash, hash), gt(vendorSessionsTable.expiresAt, now)));
    return row ?? null;
  },
  async deleteSession(hash) { await db.delete(vendorSessionsTable).where(eq(vendorSessionsTable.tokenHash, hash)); },
  async renameAccount(username, newUsername, expectedPasswordHash) {
    try {
      return await db.transaction(async tx => {
        const [current] = await tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, username)).for("update");
        if (!current || current.passwordHash !== expectedPasswordHash || current.status === "disabled") return null;
        const [taken] = await tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, newUsername));
        if (taken) return null;
        // Registered MFA methods and email settings/history follow ON UPDATE CASCADE.
        // Challenges are invalidated instead: old login/setup links must never work
        // for a different vendor who later registers the old username.
        await tx.delete(vendorSessionsTable).where(eq(vendorSessionsTable.username, username));
        await tx.delete(vendorMfaChallengesTable).where(eq(vendorMfaChallengesTable.username, username));
        if (current.vendorId) {
          await tx.delete(vendorTelegramLinkTokensTable).where(and(eq(vendorTelegramLinkTokensTable.username, username), eq(vendorTelegramLinkTokensTable.vendorId, current.vendorId)));
          await tx.update(vendorTelegramChatsTable).set({ linkedBy: newUsername }).where(and(eq(vendorTelegramChatsTable.linkedBy, username), eq(vendorTelegramChatsTable.vendorId, current.vendorId)));
        }
        // Verification hashes are username-bound; retain the verified address and
        // preferences but require a fresh code for any unverified replacement.
        await tx.update(vendorEmailSettingsTable).set({ pendingEmail: null, codeHash: null, expiresAt: null, attempts: 0 }).where(eq(vendorEmailSettingsTable.username, username));
        const [changed] = await tx.update(vendorAccountsTable).set({ username: newUsername, updatedAt: new Date() }).where(eq(vendorAccountsTable.username, username)).returning();
        await tx.insert(vendorAuditTable).values({ id: randomUUID(), actor: newUsername, action: "vendor_username_changed", details: { previousUsername: username, username: newUsername, vendorId: current.vendorId } });
        return changed;
      });
    } catch (error) {
      // A concurrent registration/rename can win the unique username constraint.
      const cause = error as { code?: string; cause?: { code?: string } };
      if (cause.code === "23505" || cause.cause?.code === "23505") return null;
      throw error;
    }
  },
  async updateAccount(username, changes, expectedPasswordHash) {
    return db.transaction(async tx => {
      const [current] = await tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, username)).for("update");
      if (!current || (expectedPasswordHash !== undefined && current.passwordHash !== expectedPasswordHash)) return null;
      const [row] = await tx.update(vendorAccountsTable).set({ ...changes, updatedAt: new Date() }).where(eq(vendorAccountsTable.username, username)).returning();
      const accessChanged = (changes.status !== undefined && changes.status !== current.status)
        || (changes.vendorId !== undefined && changes.vendorId !== current.vendorId)
        || (changes.passwordHash !== undefined && changes.passwordHash !== current.passwordHash);
      if (accessChanged) await tx.delete(vendorSessionsTable).where(eq(vendorSessionsTable.username, username));
      return row;
    });
  },
};
export function publicVendorAccount(account: VendorAccount) {
  return { username: account.username, vendorId: account.vendorId, displayName: account.displayName ?? null, status: account.status, companyName: account.companyName, contactName: account.contactName, email: account.email, createdAt: account.createdAt };
}
