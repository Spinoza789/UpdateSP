import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireVendorIdentity } from "../middleware/vendor-auth";
import { createVendorEmailSettingsService } from "../lib/vendor-email-settings";
import { vendorEmailSettingsStore } from "../lib/vendor-email-store";
import { VendorPortalError } from "../lib/vendor-portal-model";

const service = createVendorEmailSettingsService(vendorEmailSettingsStore, async (email, code) => {
  const { sendTemplatedEmail } = await import("../lib/email");
  return sendTemplatedEmail("vendor_email_verification", email, { code });
});
export function createVendorEmailSettingsRouter(
  settings = service, auth = requireVendorIdentity, limits = true,
) {
  const router = Router();
  router.use("/vendor/email-settings", auth, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  if (limits) {
    router.use("/vendor/email-settings/start", rateLimit({ windowMs: 15 * 60_000, max: 3, keyGenerator: req => req.vendor!.username, standardHeaders: true, legacyHeaders: false, message: { error: "Too many verification emails. Try again in 15 minutes." } }));
    router.use("/vendor/email-settings/verify", rateLimit({ windowMs: 15 * 60_000, max: 10, keyGenerator: req => req.vendor!.username, standardHeaders: true, legacyHeaders: false, message: { error: "Too many verification attempts. Try again in 15 minutes." } }));
  }
  const handle = (fn: (req: any) => Promise<unknown>) => async (req: any, res: any) => {
    try { res.json(await fn(req)); }
    catch (error) {
      res.status(error instanceof VendorPortalError ? error.status : 503).json({ error: error instanceof VendorPortalError ? error.message : "Email settings are temporarily unavailable." });
    }
  };
  router.get("/vendor/email-settings", handle(req => settings.get(req.vendor.username)));
  router.post("/vendor/email-settings/start", handle(req => settings.start(req.vendor.username, req.body?.email)));
  router.post("/vendor/email-settings/verify", handle(req => settings.verify(req.vendor.username, req.body?.code)));
  router.post("/vendor/email-settings/toggle", handle(req => settings.toggle(req.vendor.username, req.body?.enabled)));
  router.post("/vendor/email-settings/preferences", handle(req => settings.preferences(req.vendor.username, req.body)));
  router.post("/vendor/email-settings/cancel", handle(req => settings.cancel(req.vendor.username)));
  return router;
}
export default createVendorEmailSettingsRouter();
