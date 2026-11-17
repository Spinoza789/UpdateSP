import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { requireVendorAccount } from "../middleware/vendor-auth";
import { getVendors } from "./config";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import { paymentLedgerSummary, publicVendorReceipt } from "../lib/vendor-payment-ledger";
import { acknowledgeSupplierPaid, clearSupplierPaid, editSupplierCosts, exportSupplierPayments } from "../lib/vendor-payment-tools";
import { vendorProfitReport, productRefundReviewOptions, reviewProductRefund } from "../lib/vendor-profit-report-service";
import { vendorOrderComparison } from "../lib/vendor-order-comparison";
import { lookupTransactionDetails } from "../lib/transaction-details";
import {
  listVendorPayments,
  recordVendorPayment,
  vendorPaymentDashboard,
  voidVendorPayment,
} from "../lib/vendor-payments";
const router = Router();
function handled(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof VendorPortalError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if ((error as any)?.name === "RefundMutationBlockedError") {
        res.status(409).json({ error: "An order has an active refund." });
        return;
      }
      console.error(
        "[vendor-payments]",
        error instanceof Error ? error.message : "Request failed",
      );
      res
        .status(500)
        .json({ error: "Could not complete the vendor payment request." });
    }
  };
}
router.get("/admin/vendor-payments/transaction-details", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const network = typeof req.query.network === "string" ? req.query.network : "";
  const txid = typeof req.query.txid === "string" ? req.query.txid : "";
  if (!network || network.length > 40 || !txid || txid.length > 100) throw new VendorPortalError("Provide a supported network and TXID.");
  try {
    res.set("Cache-Control", "no-store").json(await lookupTransactionDetails(network, txid));
  } catch (error) {
    throw new VendorPortalError(error instanceof Error ? error.message : "Invalid transaction lookup.");
  }
}));
router.get("/admin/vendor-payments/order-comparison", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const vendorId = typeof req.query.vendorId === "string" && req.query.vendorId ? req.query.vendorId : undefined;
  if (vendorId && !(await getVendors()).some(vendor => vendor.id === vendorId)) throw new VendorPortalError("Vendor not found.", 404);
  const date = (key: string) => typeof req.query[key] === "string" ? req.query[key] as string : "";
  const report = await db.transaction(tx => vendorOrderComparison(
    tx, vendorId, date("from"), date("to"), date("compareFrom"), date("compareTo"),
  ), { isolationLevel: "repeatable read", accessMode: "read only" });
  res.set("Cache-Control", "no-store").json(report);
}));
router.get("/admin/vendor-payments/report", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const vendorId = typeof req.query.vendorId === "string" && req.query.vendorId ? req.query.vendorId : undefined;
  if (vendorId && !(await getVendors()).some(vendor => vendor.id === vendorId)) throw new VendorPortalError("Vendor not found.", 404);
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";
  const report = await db.transaction(tx => vendorProfitReport(tx, vendorId, from, to), { isolationLevel: "repeatable read", accessMode: "read only" });
  res.set("Cache-Control", "no-store").json(report);
}));
router.get("/admin/vendor-payments/product-refunds/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await db.transaction(
    tx => productRefundReviewOptions(tx, String(req.params.id)), { isolationLevel: "repeatable read", accessMode: "read only" }));
}));
router.post("/admin/vendor-payments/product-refunds/:id/review", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await db.transaction(
    tx => reviewProductRefund(tx, String(req.params.id), req.body, getAdminUsername(res))));
}));
router.post("/admin/vendor-payments/export", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await exportSupplierPayments(req.body));
}));
router.post("/admin/vendor-payments/acknowledge-paid", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await acknowledgeSupplierPaid(req.body, getAdminUsername(res)));
}));
router.post("/admin/vendor-payments/orders/:id/costs", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await editSupplierCosts(String(req.params.id), req.body, getAdminUsername(res)));
}));
router.post("/admin/vendor-payments/orders/:id/clear-paid", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store").json(await clearSupplierPaid(String(req.params.id), req.body, getAdminUsername(res)));
}));
router.get(
  "/admin/vendor-payments",
  handled(async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const vendors = (await getVendors()).map((v) => ({
      id: v.id,
      name: v.name,
      freeShippingThreshold: v.freeShippingThreshold ?? null,
    }));
    const vendorId =
      typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
    if (!vendorId) {
      res.set("Cache-Control", "no-store").json({
        vendors,
        vendorId: null,
        wallets: [],
        orders: [],
        payments: [],
        summary: paymentLedgerSummary([]),
      });
      return;
    }
    if (!vendors.some((v) => v.id === vendorId))
      throw new VendorPortalError("Vendor not found.", 404);
    res
      .set("Cache-Control", "no-store")
      .json({ vendors, ...(await vendorPaymentDashboard(db, vendorId)) });
  }),
);
router.get(
  "/vendor/payments",
  requireVendorAccount,
  handled(async (req, res) => {
    const access = await vendorAccess(
      db,
      req.vendor!.username,
      false,
      req.vendor!.tokenHash,
    );
    res
      .set("Cache-Control", "no-store")
      .json({ payments: (await listVendorPayments(db, access.vendorId)).map(publicVendorReceipt) });
  }),
);
router.post(
  "/admin/vendor-payments",
  handled(async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!(await getVendors()).some((v) => v.id === req.body?.vendorId))
      throw new VendorPortalError("Vendor not found.", 404);
    res.status(201).json({
      payment: await recordVendorPayment(req.body, getAdminUsername(res)),
    });
  }),
);
router.post(
  "/admin/vendor-payments/:id/void",
  handled(async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      payment: await voidVendorPayment(
        String(req.params.id),
        req.body?.reason,
        getAdminUsername(res),
      ),
    });
  }),
);
export default router;
