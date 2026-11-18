import { track17Client } from "../lib/track17-service";
import { assertVendorSubmissionUnpaid } from "../lib/vendor-payments";
import { reviewVendorSubmissionUpdate } from "../lib/vendor-submission-update";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db, accountsTable, ordersTable, orderLineItemsTable, wholesaleSharesTable,
  vendorPortalAccessTable, vendorPortalRequestsTable, vendorSubmissionsTable, vendorImagesTable,
} from "@workspace/db";
import { requireAccount } from "../middleware/account-auth";
import { requireVendorAccount } from "../middleware/vendor-auth";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { getVendors } from "./config";
import { normalizeTg } from "../lib/normalize";
import {
  auditVendor, vendorAccess, prepareVendorShipments, vendorPreviewToken,
  submitVendorOrders, loadVendorSource, isVendorSubmissionStale, vendorOrderView, rowFollowingSource,
  vendorApplicationFor, applyForVendorAccess, reviewVendorApplication,
} from "../lib/vendor-portal-service";
import { publicVendorOrder, publicVendorApplication, vendorApplicationInput, VendorPortalError } from "../lib/vendor-portal-model";
import { createAlert } from "../lib/create-alert";
import { vendorSupplierText, vendorSupplierCsv } from "../lib/vendor-supplier-export";
import { prepareTrackingWrite } from "../lib/tracking-write";
import { normalizeTrackingPackages, getTrackingPackages } from "@workspace/shipping/tracking";
import { refreshWholesaleMainParcelForShare } from "../lib/tracking-auto-refresh";
import { notifyUser } from "../lib/telegram";
import { storePageUpdateImage, downloadWholesaleUpdateImage, deleteWholesaleUpdateImage } from "../lib/wholesale-update-images";
import { WholesaleUpdateValidationError } from "../lib/wholesale-updates";

/** Order-preserving map that checks a few shipments at once: each stale check is several
 * queries, so a one-at-a-time loop made long order lists take over a minute to load. */
async function mapLimit<T, R>(items: T[], fn: (item: T) => Promise<R>, limit = 6): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await fn(items[index]); }
  }));
  return results;
}
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } }).single("file");
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      if ((error as any)?.name === "RefundMutationBlockedError") { res.status(409).json({ error: "This order has an active refund and cannot be fulfilled." }); return; }
      console.error("[vendor-portal]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the vendor request. Please try again." });
    }
  };
}
function sameOrigin(req: Request, res: Response, next: () => void) {
  if (["GET", "HEAD"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  let foreign = req.get("sec-fetch-site") === "cross-site";
  if (origin) {
    try { foreign ||= new URL(origin).host !== (req.get("x-forwarded-host") ?? req.get("host")); }
    catch { foreign = true; }
  }
  if (foreign) { res.status(403).json({ error: "Cross-site requests are not permitted." }); return; }
  next();
}
const username = (req: Request) => req.vendor?.username ?? normalizeTg(req.account!.telegramUsername);
async function imageList(row: any, prefix: "vendor" | "admin/vendor-portal" | "account", tx: any = db) {
  const images = await tx.select().from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id)).orderBy(desc(vendorImagesTable.createdAt));
  return images.map((image: any) => ({
    id: image.id, filename: image.filename, createdAt: image.createdAt,
    url: `/api/${prefix}/vendor-images/${image.id}`,
  }));
}
async function ownedSubmission(tx: any, id: string, vendorId: string, lock = false) {
  let query = tx.select().from(vendorSubmissionsTable).where(and(eq(vendorSubmissionsTable.id, id), eq(vendorSubmissionsTable.vendorId, vendorId)));
  if (lock) query = query.for("update");
  const [row] = await query;
  if (!row) throw new VendorPortalError("Order not found.", 404);
  return row;
}
async function memberMaySee(req: Request, row: any) {
  const member = username(req);
  const source = await loadVendorSource(db, row.sourceKey);
  if (source.fingerprint !== row.sourceFingerprint) throw new VendorPortalError("Images unavailable while the order is being reviewed.", 404);
  if (source.share) {
    // A combined shipment photo may contain the recipient's label. Never share it with other participants.
    if (normalizeTg(source.share.deliveryUsername ?? "") !== member) throw new VendorPortalError("Image not found.", 404);
  } else if (!source.orders.some(o => normalizeTg(o.telegramUsername) === member)) {
    throw new VendorPortalError("Image not found.", 404);
  }
}

router.get("/vendor/me", requireVendorAccount, handled(async (req, res) => {
  res.set("Cache-Control", "no-store").json(await vendorAccess(db, username(req), false, req.vendor!.tokenHash));
}));
// Retired member-based applications cannot grant access to the independent site.
router.post("/vendor/apply", (_req, res) => { res.status(410).json({ error: "Create a dedicated vendor account to apply." }); });
router.get("/vendor/orders", requireVendorAccount, handled(async (req, res) => {
  const access = await vendorAccess(db, username(req), false, req.vendor!.tokenHash);
  const rows = await db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.vendorId, access.vendorId)).orderBy(desc(vendorSubmissionsTable.submittedAt));
  const orders = [];
  orders.push(...await mapLimit(rows, async (row: any) => vendorOrderView(db, row, await imageList(row, "vendor"))));
  res.set("Cache-Control", "no-store").json({ orders });
}));
// Authentication and ownership are checked before any provider quota is used.
const carrierDetectionLimits = new Map<string, number>();
router.post("/vendor/orders/:id/detect-carrier", requireVendorAccount, sameOrigin, handled(async (req, res) => {
  const access = await vendorAccess(db, username(req), false, req.vendor!.tokenHash);
  await ownedSubmission(db, String(req.params.id), access.vendorId);
  const number = req.body?.trackingNumber;
  if (typeof number !== "string" || !/^[a-z0-9][a-z0-9 ._/-]{2,199}$/i.test(number.trim())) {
    throw new VendorPortalError("Enter a valid tracking number.");
  }
  const key = username(req);
  const now = Date.now();
  if (now - (carrierDetectionLimits.get(key) ?? 0) < 3000) {
    res.status(429).json({ error: "Please wait a few seconds before detecting again." }); return;
  }
  carrierDetectionLimits.set(key, now);
  if (carrierDetectionLimits.size > 1000) carrierDetectionLimits.delete(carrierDetectionLimits.keys().next().value!);
  const carrierCode = await track17Client.detectCarrier(number.trim());
  res.set("Cache-Control", "no-store").json({ carrierCode });
}));
async function updateShipment(req: Request, res: Response, admin = false): Promise<void> {
  const body = req.body ?? {};
  if (!["processing", "tracking"].includes(body.action) || Object.keys(body).some(k => !["action", "trackingNumber", "carrier", "trackingPackages", "expectedTrackingPackages"].includes(k))) {
    throw new VendorPortalError("Only processing and tracking updates are permitted.");
  }
  let refreshShare: string | null = null;
  const notifications: Array<{ username: string; code: string }> = [];
  await db.transaction(async tx => {
    let vendorId: string;
    if (admin) {
      const [candidate] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, String(req.params.id)));
      if (!candidate) throw new VendorPortalError("Submission not found.", 404);
      vendorId = candidate.vendorId;
    } else {
      vendorId = (await vendorAccess(tx, username(req), true, req.vendor!.tokenHash)).vendorId;
    }
    // Parent and orders first, matching shared-order mutations; submission is locked last.
    const initial = await ownedSubmission(tx, String(req.params.id), vendorId);
    const source = await loadVendorSource(tx, initial.sourceKey, true);
    const row = await ownedSubmission(tx, initial.id, vendorId, true);
    if (source.fingerprint !== row.sourceFingerprint || source.vendorIds.some(id => id !== vendorId)) {
      throw new VendorPortalError("The order changed after submission. Ask Admin to review it before continuing.", 409);
    }
    if (source.orders.some(o => o.status === "Completed")) throw new VendorPortalError("Completed orders cannot be changed by the vendor.", 409);
    const now = new Date();
    if (body.action === "processing") {
      if (row.status === "Shipped" || source.orders.some(o => o.status === "Shipped")) throw new VendorPortalError("A shipped order cannot move back to processing.", 409);
      await tx.update(ordersTable).set({ status: "Processing", updatedAt: now }).where(and(inArray(ordersTable.id, row.orderIds), eq(ordersTable.status, "Submitted")));
      await tx.update(vendorSubmissionsTable).set({ status: "Processing", updatedAt: now }).where(eq(vendorSubmissionsTable.id, row.id));
    } else {
      let packages;
      try {
        if (body.expectedTrackingPackages !== undefined &&
            JSON.stringify(normalizeTrackingPackages(body.expectedTrackingPackages)) !==
            JSON.stringify(normalizeTrackingPackages(publicVendorOrder(rowFollowingSource(row, source), false, []).trackingPackages)) &&
            JSON.stringify(normalizeTrackingPackages(body.expectedTrackingPackages)) !==
            JSON.stringify(normalizeTrackingPackages(publicVendorOrder(row, false, []).trackingPackages))) {
          throw new VendorPortalError("Tracking changed since you opened this order. Reload it before saving.", 409);
        }
        if (body.trackingPackages !== undefined && (body.trackingNumber !== undefined || body.carrier !== undefined)) {
          throw new Error("Send parcel tracking or legacy tracking, not both.");
        }
        if (body.trackingPackages === undefined && (row.trackingPackages?.length ?? 0) > 1) {
          throw new VendorPortalError("Reload the order and edit all tracking parcels together.", 409);
        }
        packages = normalizeTrackingPackages(body.trackingPackages ?? [{
          id: row.trackingPackages?.[0]?.id ?? "legacy-0", courier: body.carrier,
          internationalTrackingNumber: body.trackingNumber, localTrackingNumber: null,
        }]);
        if (!packages.length) throw new Error("Add at least one tracking number.");
        if (packages.some(p => p.internationalTrackingNumber.length < 3)) throw new Error("Enter a valid tracking number.");
        // An older/simpler editor must not erase an existing BMURFS local leg.
        for (const old of row.trackingPackages ?? []) {
          const next = packages.find(p => p.id === old.id);
          if (old.localTrackingNumber && (!next || next.localTrackingNumber !== old.localTrackingNumber)) {
            throw new VendorPortalError("Keep the existing local tracking leg; use the package editor to change it.", 409);
          }
        }
      } catch (error) {
        if (error instanceof VendorPortalError) throw error;
        throw new VendorPortalError(error instanceof Error ? error.message : "Enter valid tracking parcels.");
      }
      const trackingNumber = packages[0].internationalTrackingNumber;
      const carrier = packages[0].courier;
      const mixed = source.share && (source.share.vendorShippingBreakdown?.length ?? 0) > 1;
      const otherSubmissions = mixed ? await tx.select().from(vendorSubmissionsTable)
        .where(eq(vendorSubmissionsTable.sharedOrderId, row.sharedOrderId!)) : [];
      for (const order of source.orders) {
        if (mixed) {
          const lines = await tx.select({ vendorId: orderLineItemsTable.vendorId }).from(orderLineItemsTable)
            .where(eq(orderLineItemsTable.orderId, order.id));
          const expected = [...new Set(lines.map(l => l.vendorId ?? source.share.vendorId))];
          const allShipped = expected.every(id => id === row.vendorId || otherSubmissions.some(s => s.vendorId === id && s.status === "Shipped" && s.orderIds.includes(order.id)));
          await tx.update(ordersTable).set({status:allShipped ? "Shipped" : "Processing",updatedAt:now}).where(eq(ordersTable.id,order.id));
          if (allShipped && order.status !== "Shipped") notifications.push({username:order.telegramUsername,code:order.code});
          continue;
        }
        // Retain independently managed parcels/local legs on the customer order.
        const previousVendorIds = new Set((row.trackingPackages ?? []).map(p => p.id));
        const independent = getTrackingPackages(order).filter(p =>
          !previousVendorIds.has(p.id) && p.internationalTrackingNumber !== row.trackingNumber &&
          !packages.some(next => next.internationalTrackingNumber.toUpperCase() === p.internationalTrackingNumber.toUpperCase()));
        const nextPackages = [...packages, ...independent];
        for (const previous of getTrackingPackages(order)) {
          if (previous.localTrackingNumber && !nextPackages.some(p =>
            p.internationalTrackingNumber === previous.internationalTrackingNumber &&
            p.courier === previous.courier && p.localTrackingNumber === previous.localTrackingNumber)) {
            throw new VendorPortalError("This parcel has a local tracking leg. Keep it intact in the package editor before updating vendor tracking.", 409);
          }
        }
        const changed = JSON.stringify(order.trackingPackages) !== JSON.stringify(nextPackages) || order.shippingCarrier !== carrier || order.status !== "Shipped";
        if (!changed) continue;
        let tracking;
        try {
          tracking = prepareTrackingWrite(order, { trackingPackages: nextPackages });
        } catch (error) {
          throw new VendorPortalError(error instanceof Error ? error.message : "Review the tracking packages.", 409);
        }
        await tx.update(ordersTable).set({ ...tracking.updates, shippingCarrier: carrier, status: "Shipped", updatedAt: now })
          .where(eq(ordersTable.id, order.id));
        if (tracking.shouldNotify || order.status !== "Shipped") notifications.push({ username: order.telegramUsername, code: order.code });
      }
      await tx.update(vendorSubmissionsTable).set({ status: "Shipped", trackingNumber, carrier, trackingPackages: packages, updatedAt: now }).where(eq(vendorSubmissionsTable.id, row.id));
      if (row.sharedOrderId && !mixed) refreshShare = row.sharedOrderId;
    }
    await auditVendor(tx, admin ? getAdminUsername(res) : username(req), body.action, row.id, admin ? { actorType: "admin" } : undefined);
  });
  // Never publish a shared supplier tracking number in member notifications.
  for (const order of notifications) void notifyUser(order.username, "status",
    `Order #${order.code} has been shipped. View your order for tracking updates.`).catch(() => {});
  if (refreshShare) void refreshWholesaleMainParcelForShare(refreshShare).catch(() => {});
  res.json({ ok: true });
}
router.patch("/vendor/orders/:id", requireVendorAccount, sameOrigin, handled((req, res) => updateShipment(req, res)));
router.patch("/admin/vendor-portal/orders/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  await updateShipment(req, res, true);
}));
/**
 * Admin backfill for shipments that were sent before the panel existed. It only marks the
 * vendor shipment as fulfilled: the customer's order is not touched and nobody is notified.
 */
router.post("/admin/vendor-portal/orders/manual-fulfil", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const ids: unknown = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || ids.some(id => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id))) {
    throw new VendorPortalError("Choose between 1 and 200 orders to mark as fulfilled.");
  }
  const wanted = [...new Set(ids as string[])];
  const result = await db.transaction(async tx => {
    const rows = await tx.select().from(vendorSubmissionsTable).where(inArray(vendorSubmissionsTable.id, wanted)).for("update");
    if (rows.length !== wanted.length) throw new VendorPortalError("Some of those orders no longer exist. Refresh and try again.", 404);
    const now = new Date();
    let fulfilled = 0;
    for (const row of rows) {
      if (row.status === "Shipped") continue;
      await tx.update(vendorSubmissionsTable).set({ status: "Shipped", updatedAt: now }).where(eq(vendorSubmissionsTable.id, row.id));
      await auditVendor(tx, getAdminUsername(res), "manual_fulfil", row.id, { actorType: "admin", previousStatus: row.status, customerNotified: false });
      fulfilled++;
    }
    return { fulfilled, alreadyFulfilled: rows.length - fulfilled };
  });
  res.json({ ok: true, ...result });
}));
router.post("/vendor/orders/:id/images", requireVendorAccount, sameOrigin, (req, res, next) => {
  upload(req, res, err => {
    if (err) { res.status(400).json({ error: "Upload one image, 5 MB or smaller." }); return; }
    next();
  });
}, handled(async (req, res) => {
  if (!req.file) throw new VendorPortalError("Choose an image.");
  // Authorize and check freshness before any storage work.
  const access = await vendorAccess(db, username(req), false, req.vendor!.tokenHash);
  const initial = await ownedSubmission(db, String(req.params.id), access.vendorId);
  if (await isVendorSubmissionStale(db, initial)) throw new VendorPortalError("Order changed. Ask Admin to review it.", 409);
  let path: string;
  try { path = await storePageUpdateImage(req.file.buffer, "vendor-dispatch"); }
  catch (error) {
    if (error instanceof WholesaleUpdateValidationError) throw new VendorPortalError(error.message);
    throw error;
  }
  try {
    await db.transaction(async tx => {
      const access = await vendorAccess(tx, username(req), true, req.vendor!.tokenHash);
      const source = await loadVendorSource(tx, initial.sourceKey, true);
      const row = await ownedSubmission(tx, initial.id, access.vendorId, true);
      if (source.fingerprint !== row.sourceFingerprint) throw new VendorPortalError("Order changed during upload. Ask Admin to review it.", 409);
      const existing = await tx.select({ id: vendorImagesTable.id }).from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id));
      if (existing.length >= 30) throw new VendorPortalError("Maximum 30 photos per shipment.");
      await tx.insert(vendorImagesTable).values({
        id: randomUUID(), submissionId: row.id, objectPath: path,
        filename: req.file!.originalname.replace(/[^\w .()-]/g, "_").slice(0, 120) || "Dispatch photo",
        uploadedBy: username(req),
      });
      await auditVendor(tx, username(req), "image_uploaded", row.id);
    });
  } catch (error) { await deleteWholesaleUpdateImage(path).catch(() => {}); throw error; }
  res.status(201).json({ ok: true });
}));

router.get("/admin/vendor-portal", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(vendorSubmissionsTable).orderBy(desc(vendorSubmissionsTable.submittedAt));
  const submissions = [];
  for (const row of rows) submissions.push({
    id: row.id, reference: row.reference, vendorId: row.vendorId, status: row.status,
    submittedAt: row.submittedAt, stale: await isVendorSubmissionStale(db, row),
  });
  const applications = await db.select().from(vendorPortalRequestsTable).orderBy(desc(vendorPortalRequestsTable.updatedAt)).limit(200);
  res.json({
    vendors: (await getVendors()).map(v => ({ id: v.id, name: v.name })),
    access: await db.select({ username: vendorPortalAccessTable.username, vendorId: vendorPortalAccessTable.vendorId }).from(vendorPortalAccessTable),
    applications: applications.map(a => publicVendorApplication(a, true)),
    submissions,
  });
}));
router.post("/admin/vendor-portal/applications/:username/review", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.status(410).json({ error: "Manage dedicated vendor accounts under vendor account management." });
});
router.put("/admin/vendor-portal/access", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.status(410).json({ error: "Create or approve a dedicated vendor account instead of granting member access." });
});
function submissionInput(req: Request) {
  const { vendorId, orderCodes } = req.body ?? {};
  if (typeof vendorId !== "string" || !Array.isArray(orderCodes) || orderCodes.some(c => typeof c !== "string")) throw new VendorPortalError("Choose a vendor and enter order numbers.");
  return { vendorId, orderCodes };
}
router.post("/admin/vendor-portal/preview", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, orderCodes } = submissionInput(req);
  const prepared = await db.transaction(tx => prepareVendorShipments(tx, vendorId, orderCodes));
  res.json({ shipments: prepared.map(p => publicVendorOrder(p, false, [])), previewToken: vendorPreviewToken(prepared) });
}));
router.post("/admin/vendor-portal/submit", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, orderCodes } = submissionInput(req);
  res.json(await submitVendorOrders(vendorId, orderCodes, req.body.previewToken, getAdminUsername(res)));
}));
router.get("/admin/vendor-portal/orders", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const vendors = (await getVendors()).map(v => ({ id: v.id, name: v.name }));
  const vendorId = req.query.vendorId;
  if (vendorId !== undefined && (typeof vendorId !== "string" || !vendors.some(v => v.id === vendorId))) {
    throw new VendorPortalError("Choose a valid vendor.");
  }
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if ((req.query.page !== undefined && typeof req.query.page !== "string")
    || (req.query.limit !== undefined && typeof req.query.limit !== "string")
    || !Number.isSafeInteger(page) || page < 1 || page > 100000
    || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new VendorPortalError("Use a positive page number and a limit from 1 to 100.");
  }
  const where = typeof vendorId === "string" ? eq(vendorSubmissionsTable.vendorId, vendorId) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(vendorSubmissionsTable).where(where);
  const rows = await db.select().from(vendorSubmissionsTable).where(where)
    .orderBy(desc(vendorSubmissionsTable.submittedAt), desc(vendorSubmissionsTable.id)).limit(limit).offset((page - 1) * limit);
  const orders = await mapLimit(rows, async (row: any) => ({
    ...await vendorOrderView(db, row, []),
    vendorId: row.vendorId, vendorName: vendors.find(v => v.id === row.vendorId)?.name ?? row.vendorId,
  }));
  res.set("Cache-Control", "no-store").json({ vendors, orders, total, page, limit });
}));
router.get("/admin/vendor-portal/orders/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [row] = await db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, String(req.params.id)));
  if (!row) throw new VendorPortalError("Submission not found.", 404);
  const vendors = await getVendors();
  res.set("Cache-Control", "no-store").json({
    ...await vendorOrderView(db, row, await imageList(row, "admin/vendor-portal")),
    vendorId: row.vendorId, vendorName: vendors.find(v => v.id === row.vendorId)?.name ?? row.vendorId,
  });
}));
router.post("/admin/vendor-portal/orders/:id/update", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await db.transaction(tx =>
    reviewVendorSubmissionUpdate(tx, String(req.params.id), getAdminUsername(res), req.body?.previewToken)));
}));
router.delete("/admin/vendor-portal/orders/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const override = req.body?.override === true;
  if (req.body?.override !== undefined && typeof req.body.override !== "boolean") {
    throw new VendorPortalError("Override must be true or false.");
  }
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (override && (!reason || reason.length > 2000)) {
    throw new VendorPortalError("An Admin removal reason is required (maximum 2,000 characters).");
  }
  await db.transaction(async tx => {
    const [candidate] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, String(req.params.id)));
    if (!candidate) throw new VendorPortalError("Submission not found.", 404);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-submit:${candidate.sourceKey}`}))`);
    const [row] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, candidate.id)).for("update");
    if (!row) throw new VendorPortalError("Submission not found.", 404);
    await assertVendorSubmissionUnpaid(tx, row.id);
    if (row.status !== "Submitted" && !override) throw new VendorPortalError("Vendor has started this shipment. Admin override with a reason is required to remove it.", 409);
    const images = await tx.select().from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id));
    if (images.length && !override) throw new VendorPortalError("Vendor has uploaded photos. Admin override with a reason is required to remove it.", 409);
    await auditVendor(tx, getAdminUsername(res), "submission_recalled", row.id, {
      sourceKey: row.sourceKey, vendorId: row.vendorId,
      ...(override ? { override: true, reason, previousStatus: row.status, trackingNumber: row.trackingNumber, submission: row, images } : {}),
    });
    await tx.delete(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, row.id));
  });
  res.json({ ok: true });
}));
router.post("/admin/vendor-portal/export", handled(async (req,res) => {
  if (!requireAdmin(req,res)) return;
  const vendor = (await getVendors()).find(v=>v.id===req.body?.vendorId);
  const codes = req.body?.orderCodes;
  if (!vendor || !Array.isArray(codes) || codes.some(c=>typeof c !== "string")) throw new VendorPortalError("Choose a vendor and orders to export.");
  const shipments = await db.transaction(tx=>prepareVendorShipments(tx,vendor.id,codes,"export"));
  const csv=req.body?.format==="csv";
  const filename = csv ? `supplier-${vendor.id}.csv` : `wholesale-orders-${shipments.length}-${new Date().toISOString().slice(0,10)}.txt`;
  res.set("Cache-Control","no-store").json({filename,text:csv?vendorSupplierCsv(shipments,vendor.name):vendorSupplierText(shipments,vendor.name)});
}));

router.get("/account/orders/:id/vendor-images", requireAccount, handled(async (req, res) => {
  const [order] = await db.select({ id: ordersTable.id, sharedOrderId: ordersTable.sharedOrderId, username: ordersTable.telegramUsername })
    .from(ordersTable).where(eq(ordersTable.id, String(req.params.id)));
  if (!order || normalizeTg(order.username) !== username(req)) throw new VendorPortalError("Order not found.", 404);
  const rows = await db.select().from(vendorSubmissionsTable).where(order.sharedOrderId
    ? eq(vendorSubmissionsTable.sharedOrderId,order.sharedOrderId)
    : eq(vendorSubmissionsTable.sourceKey,`order:${order.id}`));
  const images = [];
  for (const row of rows) {
    try { await memberMaySee(req,row); images.push(...await imageList(row,"account")); }
    catch (error) { if (!(error instanceof VendorPortalError)) throw error; }
  }
  res.set("Cache-Control", "no-store").json({ images });
}));

router.get("/account/orders/:id/vendor-shipments", requireAccount, handled(async (req, res) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, String(req.params.id)));
  if (!order || normalizeTg(order.telegramUsername) !== username(req)) throw new VendorPortalError("Order not found.",404);
  let recipient = !order.sharedOrderId;
  let expectedVendorIds: string[] = [];
  if (order.sharedOrderId) {
    const [share] = await db.select({recipient:wholesaleSharesTable.deliveryUsername,breakdown:wholesaleSharesTable.vendorShippingBreakdown}).from(wholesaleSharesTable).where(eq(wholesaleSharesTable.id,order.sharedOrderId));
    recipient = normalizeTg(share?.recipient ?? "") === username(req);
    if (recipient) expectedVendorIds=(share?.breakdown ?? []).map(p=>p.vendorId);
  }
  if (!expectedVendorIds.length) {
    const lines=await db.select({vendorId:orderLineItemsTable.vendorId}).from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId,order.id));
    expectedVendorIds=[...new Set(lines.map(l=>l.vendorId).filter((id):id is string=>!!id))];
  }
  const rows = await db.select().from(vendorSubmissionsTable).where(order.sharedOrderId
    ? eq(vendorSubmissionsTable.sharedOrderId,order.sharedOrderId)
    : eq(vendorSubmissionsTable.sourceKey,`order:${order.id}`));
  const vendors = await getVendors();
  const shipments = [];
  const shown=new Set<string>();
  for (const row of rows) {
    if (!recipient && !row.orderIds.includes(order.id)) continue;
    if (await isVendorSubmissionStale(db,row)) continue;
    shown.add(row.vendorId);
    shipments.push({
      id:row.id, vendorName:vendors.find(v=>v.id===row.vendorId)?.name ?? "Vendor",
      status:row.status, trackingNumber:recipient ? row.trackingNumber : null,
      carrier:recipient ? row.carrier : null, trackingMasked:!recipient,
      trackingPackages: recipient ? publicVendorOrder(row, false, []).trackingPackages : [],
      images:recipient ? await imageList(row,"account") : [],
    });
  }
  for (const id of expectedVendorIds.filter(id=>!shown.has(id))) {
    shipments.push({id:`pending:${id}`,vendorName:vendors.find(v=>v.id===id)?.name ?? "Vendor",status:"Awaiting vendor processing",
      trackingNumber:null,carrier:null,trackingMasked:!recipient,images:[]});
  }
  res.set("Cache-Control","no-store").json({shipments});
}));

function imageHandler(mode: "vendor" | "admin" | "account"): Handler {
  return handled(async (req, res) => {
    if (mode === "admin" && !requireAdmin(req, res)) return;
    const [image] = await db.select().from(vendorImagesTable).where(eq(vendorImagesTable.id, String(req.params.id)));
    if (!image) throw new VendorPortalError("Image not found.", 404);
    const [row] = await db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, image.submissionId));
    if (!row) throw new VendorPortalError("Image not found.", 404);
    if (mode === "vendor") {
      const access = await vendorAccess(db, username(req), false, req.vendor!.tokenHash);
      if (row.vendorId !== access.vendorId) throw new VendorPortalError("Image not found.", 404);
    } else if (mode === "account") await memberMaySee(req, row);
    const bytes = await downloadWholesaleUpdateImage(image.objectPath);
    res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }).send(bytes);
  });
}
router.get("/vendor/vendor-images/:id", requireVendorAccount, imageHandler("vendor"));
router.get("/account/vendor-images/:id", requireAccount, imageHandler("account"));
router.get("/admin/vendor-portal/vendor-images/:id", imageHandler("admin"));
export default router;
