import { db, emailTemplatesTable } from "@workspace/db";
import { COA_EVENTS, COA_EMAIL_VARS } from "./coa-notification-content";

const EMAIL_VERIFICATION_TEMPLATE = {
  eventKey: "email_verification",
  name: "Verify your email",
  subject: "Your Salt & Peps verification code",
  bodyHtml: `<p>Hello {{username}},</p><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:0.15em">{{code}}</p><p>This code expires in 15 minutes. If you did not create an account, you can ignore this email.</p>`,
  availableVars: JSON.stringify([
    { key: "code", description: "6-digit verification code" },
    { key: "username", description: "Account username" },
  ]),
  isActive: true,
};

/** Adds required system templates without modifying administrator customizations. */
export async function ensureSystemEmailTemplates(): Promise<void> {
  await db.insert(emailTemplatesTable).values(EMAIL_VERIFICATION_TEMPLATE).onConflictDoNothing();
  await db.insert(emailTemplatesTable).values([
    {
      eventKey: "vendor_email_verification", name: "Verify vendor notification email", fromName: "Peps Anonymous",
      subject: "Your Peps Anonymous email verification code",
      bodyHtml: `<p>Your notification email verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:0.15em">{{code}}</p><p>Enter this code in vendor Settings. It expires in 15 minutes. If you did not request it, ignore this email.</p>`,
      availableVars: JSON.stringify([{ key: "code", description: "One-time verification code" }]), isActive: true,
    },
    ...["new_order", "message"].map(kind => ({
      eventKey: `vendor_${kind}`, name: kind === "new_order" ? "New vendor shipment" : "New vendor message", fromName: "Peps Anonymous",
      subject: kind === "new_order" ? "Peps Anonymous: new shipment assigned to you" : "Peps Anonymous: new message",
      bodyHtml: `<p><strong>{{title}}</strong></p><p>Sign in to the Peps Anonymous vendor portal to ${kind === "new_order" ? "view this shipment and start packing" : "read and reply to your message"}.</p><p>You can turn off these emails in Settings → Email notifications. Only new orders and messages are emailed.</p>`,
      availableVars: JSON.stringify([{ key: "title", description: "Notification title" }]), isActive: true,
    })),
  ]).onConflictDoNothing();
  await db.insert(emailTemplatesTable).values(COA_EVENTS.map(event => ({
    eventKey: `coa_${event}`, name: `COA request: ${event}`,
    subject: `COA request ${event} — {{order_code}}`,
    bodyHtml: `<p>Order <strong>{{order_code}}</strong></p><p>{{message}}</p><p>Separate COA fee: {{fee}} {{currency}}</p><p><a href="{{order_url}}">View your COA request</a></p>`,
    availableVars: JSON.stringify(COA_EMAIL_VARS), isActive: true,
  }))).onConflictDoNothing();
}