import { Router } from "express";
import { db, productsTable, siteConfigTable, auditLogsTable } from "@workspace/db";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { resolveProductVendor } from "../lib/multi-vendor-shipping";
import { exportPriceCsv, planPriceCsv } from "../lib/wholesale-price-csv";
import { VendorPortalError } from "../lib/vendor-portal-model";

const router = Router();
// Supplier configuration and offers are re-read inside the transaction, including on Apply.
async function catalogue(tx: any, vendorId: string, apply: boolean) {
  const [config] = await tx.select().from(siteConfigTable)
    .where(eq(siteConfigTable.key, "wholesale_vendors")).for("share");
  const vendors = config?.value ? JSON.parse(config.value) : [];
  const vendor = vendors.find((v: any) => v.id === vendorId);
  if (!vendor) throw new VendorPortalError("Choose a configured wholesale supplier.", 400);
  const names = [...new Set([vendor.id, vendor.name, vendor.legacyCatalogueVendor]
    .filter(Boolean).map((v: string) => v.trim().toLowerCase()))] as string[];
  const scope = and(eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId),
    or(eq(productsTable.wholesaleVendorId, vendorId),
      and(isNull(productsTable.wholesaleVendorId), inArray(sql`lower(trim(${productsTable.vendor}))`, names))));
  const query = tx.select({ id: productsTable.id, name: productsTable.name, vendor: productsTable.vendor,
    wholesaleVendorId: productsTable.wholesaleVendorId, wholesaleCost: productsTable.wholesaleCost,
    wholesalePrice: productsTable.wholesalePrice }).from(productsTable).where(scope).orderBy(asc(productsTable.id));
  const all = await (apply ? query.for("update") : query);
  return { vendor, products: all.filter((p: any) => resolveProductVendor(p, vendors)?.id === vendorId), scope };
}
router.get("/admin/wholesale-products/price-csv", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (typeof req.query.vendorId !== "string") { res.status(400).json({ error: "Choose a wholesale supplier." }); return; }
  try {
    const result = await db.transaction(async tx => {
      const { products } = await catalogue(tx, req.query.vendorId as string, false);
      return exportPriceCsv(products);
    });
    res.type("text/csv; charset=utf-8").setHeader("Content-Disposition", 'attachment; filename="wholesale-prices.csv"');
    res.send(result);
  } catch (e) {
    if (e instanceof VendorPortalError) { res.status(e.status).json({ error: e.message }); return; }
    console.error("[wholesale-price-csv] export", e);
    res.status(500).json({ error: "Could not export wholesale prices." });
  }
});
router.post("/admin/wholesale-products/price-csv", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, csv, apply, previewToken } = req.body ?? {};
  if (typeof vendorId !== "string" || typeof csv !== "string" || typeof apply !== "boolean"
    || (apply && (typeof previewToken !== "string" || !/^[a-f0-9]{64}$/.test(previewToken)))) {
    res.status(400).json({ error: "Choose a CSV and review its prices before applying." }); return;
  }
  try {
    const result = await db.transaction(async tx => {
      const { products, scope } = await catalogue(tx, vendorId, apply);
      const plan = planPriceCsv(csv, products, vendorId);
      if (!apply) return { ...plan, applied: false, updated: 0 };
      if (plan.previewToken !== previewToken) throw new VendorPortalError("Prices or supplier assignments changed since your review. Review the CSV again; nothing was saved.", 409);
      for (const change of plan.changes) {
        const updates = { ...(change.cost !== undefined ? { wholesaleCost: change.cost } : {}),
          ...(change.price !== undefined ? { wholesalePrice: change.price } : {}) };
        const written = await tx.update(productsTable).set(updates)
          .where(and(eq(productsTable.id, change.id), scope)).returning({ id: productsTable.id });
        if (written.length !== 1) throw new VendorPortalError("A product changed during import. Nothing was saved; review again.", 409);
      }
      if (plan.changes.length) await tx.insert(auditLogsTable).values({
        type: "change", level: "info", action: "wholesale_price_csv_import",
        message: `Updated ${plan.changes.length} wholesale product prices`,
        metadata: { vendorId, products: plan.changes, adminUsername: res.locals["adminUser"]?.username ?? null }, ip: req.ip,
      });
      return { ...plan, applied: true, updated: plan.changes.length };
    });
    res.json(result);
  } catch (e) {
    if (e instanceof VendorPortalError) { res.status(e.status).json({ error: e.message }); return; }
    console.error("[wholesale-price-csv] import", e);
    res.status(500).json({ error: "Could not import prices. No changes were saved." });
  }
});
export default router;
