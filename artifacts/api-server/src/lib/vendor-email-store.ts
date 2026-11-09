import { db, vendorEmailSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { emptyEmailSettings, type EmailSettingsStore } from "./vendor-email-settings";

export const vendorEmailSettingsStore: EmailSettingsStore = {
  async get(username) {
    const [row] = await db.select().from(vendorEmailSettingsTable).where(eq(vendorEmailSettingsTable.username, username));
    return row ?? emptyEmailSettings(username);
  },
  async mutate(username, fn) {
    return db.transaction(async tx => {
      await tx.insert(vendorEmailSettingsTable).values({ username }).onConflictDoNothing();
      const [row] = await tx.select().from(vendorEmailSettingsTable).where(eq(vendorEmailSettingsTable.username, username)).for("update");
      const { patch, value } = fn(row);
      if (Object.keys(patch).length) await tx.update(vendorEmailSettingsTable).set(patch).where(eq(vendorEmailSettingsTable.username, username));
      return value;
    });
  },
};
