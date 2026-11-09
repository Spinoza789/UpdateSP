import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { registerScheduler } from "./scheduler-registry";
import { deliverVendorEmails, type VendorEmailQueue, type VendorEmailItem } from "./vendor-email-delivery";

export async function ensureVendorEmailSchema(database: { execute: (query: any) => Promise<unknown> }) {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_email_settings (
      username text PRIMARY KEY REFERENCES vendor_accounts(username) ON UPDATE CASCADE ON DELETE CASCADE,
      email text, enabled boolean NOT NULL DEFAULT false, verified_at timestamptz,
      pending_email text, code_hash text, expires_at timestamptz, attempts integer NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vendor_email_deliveries (
      notification_id text NOT NULL, username text NOT NULL REFERENCES vendor_accounts(username) ON UPDATE CASCADE ON DELETE CASCADE,
      recipient text NOT NULL, vendor_id text NOT NULL, kind text NOT NULL, title text NOT NULL,
      attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz, cancelled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (notification_id, username)
    );
    CREATE INDEX IF NOT EXISTS vendor_email_deliveries_pending_idx ON vendor_email_deliveries(next_attempt_at);
    ALTER TABLE vendor_email_settings ADD COLUMN IF NOT EXISTS new_orders boolean NOT NULL DEFAULT true;
    ALTER TABLE vendor_email_settings ADD COLUMN IF NOT EXISTS messages boolean NOT NULL DEFAULT true;
    ALTER TABLE vendor_email_settings ADD COLUMN IF NOT EXISTS new_orders_since timestamptz NOT NULL DEFAULT now();
    ALTER TABLE vendor_email_settings ADD COLUMN IF NOT EXISTS messages_since timestamptz NOT NULL DEFAULT now();
  `);
}
const identity = (item: VendorEmailItem) => sql`notification_id = ${item.notificationId} AND username = ${item.username}`;
const queue: VendorEmailQueue = {
  async enqueue() {
    // Read committed notifications only; independent of Telegram connection/poller delivery.
    return db.execute(sql`
      INSERT INTO vendor_email_deliveries (notification_id, username, recipient, vendor_id, kind, title)
      SELECT n.id, a.username, s.email, a.vendor_id, n.kind, n.title
      FROM vendor_notifications n
      JOIN vendor_accounts a ON a.vendor_id = n.vendor_id AND a.status = 'active'
      JOIN vendor_email_settings s ON s.username = a.username
      WHERE n.kind IN ('new_order', 'message') AND s.enabled = true
        AND ((n.kind = 'new_order' AND s.new_orders = true AND n.created_at >= s.new_orders_since)
          OR (n.kind = 'message' AND s.messages = true AND n.created_at >= s.messages_since))
        AND s.email IS NOT NULL AND s.verified_at IS NOT NULL
        AND n.created_at >= s.verified_at AND n.created_at > now() - interval '24 hours'
      ON CONFLICT DO NOTHING
    `);
  },
  async pending() {
    const result = await db.execute(sql`
      SELECT notification_id AS "notificationId", username, recipient, kind, title, attempts
      FROM vendor_email_deliveries WHERE sent_at IS NULL AND cancelled_at IS NULL
        AND attempts < 5 AND next_attempt_at <= now() AND created_at > now() - interval '23 hours'
      ORDER BY created_at LIMIT 50
    `);
    return result.rows as unknown as VendorEmailItem[];
  },
  async eligible(item) {
    const result = await db.execute(sql`
      SELECT 1 FROM vendor_email_settings s JOIN vendor_accounts a ON a.username = s.username
      JOIN vendor_email_deliveries d ON d.username = s.username
      WHERE d.notification_id = ${item.notificationId} AND d.username = ${item.username}
        AND s.enabled = true AND s.verified_at IS NOT NULL AND s.email = d.recipient
        AND ((d.kind = 'new_order' AND s.new_orders = true AND d.created_at >= s.new_orders_since)
          OR (d.kind = 'message' AND s.messages = true AND d.created_at >= s.messages_since))
        AND a.status = 'active' AND a.vendor_id = d.vendor_id AND d.created_at >= s.verified_at
    `);
    return !!result.rows.length;
  },
  async finish(item) { return db.execute(sql`UPDATE vendor_email_deliveries SET sent_at = now() WHERE ${identity(item)} AND sent_at IS NULL`); },
  async retry(item) {
    console.warn("[vendor-email] Delivery failed; retry scheduled", { notificationId: item.notificationId, attempt: item.attempts + 1 });
    return db.execute(sql`UPDATE vendor_email_deliveries SET attempts = attempts + 1, next_attempt_at = now() + interval '5 minutes' WHERE ${identity(item)} AND sent_at IS NULL`);
  },
  async cancel(item) { return db.execute(sql`UPDATE vendor_email_deliveries SET cancelled_at = now() WHERE ${identity(item)} AND sent_at IS NULL`); },
};
export function registerVendorEmailScheduler() {
  registerScheduler({
    name: "vendor-email-alerts", label: "Vendor email alerts", description: "Email verified, opted-in vendors about new shipments and messages only.",
    defaultIntervalMs: 60_000, minIntervalMs: 30_000, maxIntervalMs: 600_000, initialDelayMs: 20_000,
    run: async () => {
      const { sendTemplatedEmail } = await import("./email");
      await deliverVendorEmails(queue, sendTemplatedEmail);
    },
  });
}
