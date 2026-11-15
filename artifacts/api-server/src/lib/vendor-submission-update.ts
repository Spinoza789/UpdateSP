import { eq, sql } from "drizzle-orm";
import { vendorImagesTable, vendorSubmissionsTable } from "@workspace/db";
import { auditVendor, loadVendorSource, prepareVendorShipments, vendorPreviewToken, type Executor } from "./vendor-portal-service";
import { assertVendorSubmissionUnpaid } from "./vendor-payments";
import { VendorPortalError, publicVendorOrder } from "./vendor-portal-model";

/**
 * Caller owns the transaction. Lock parent orders before the submission, like
 * fulfilment and payment recording; revalidate everything on confirmation.
 */
export async function reviewVendorSubmissionUpdate(tx: Executor, id: string, actor: string, token?: unknown) {
  if (token !== undefined && (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))) {
    throw new VendorPortalError("Refresh the update preview before confirming.", 409);
  }
  const [candidate] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, id));
  if (!candidate) throw new VendorPortalError("Submission not found.", 404);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-submit:${candidate.sourceKey}`}))`);
  const source = await loadVendorSource(tx, candidate.sourceKey, true);
  const [row] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, id)).for("update");
  if (!row) throw new VendorPortalError("Submission not found.", 404);
  await assertVendorSubmissionUnpaid(tx, row.id);
  if (row.status !== "Submitted" || row.trackingNumber || row.carrier) {
    throw new VendorPortalError("Vendor fulfilment has started. Coordinate with the vendor before changing this shipment.", 409);
  }
  const images = await tx.select({ id: vendorImagesTable.id }).from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id));
  if (images.length) throw new VendorPortalError("Vendor photos are already attached. Coordinate with the vendor before changing this shipment.", 409);
  if (source.fingerprint === row.sourceFingerprint) throw new VendorPortalError("This submission already matches the order. Refresh the payment list.", 409);
  const prepared = await prepareVendorShipments(tx, row.vendorId, [source.orders[0].code], "submission", row.id);
  if (prepared.length !== 1 || prepared[0].sourceKey !== row.sourceKey) {
    throw new VendorPortalError("Supplier ownership changed. Review the vendor assignment before resubmitting.", 409);
  }
  const next = prepared[0];
  // Bind both old evidence and the proposed replacement, not just current order.
  const previewToken = vendorPreviewToken([row, next]);
  if (token !== undefined) {
    if (token !== previewToken) throw new VendorPortalError("Order or supplier costs changed. Review the updated submission again.", 409);
    await auditVendor(tx, actor, "submission_updated", row.id, {
      before: { snapshot: row.snapshot, sourceFingerprint: row.sourceFingerprint, orderIds: row.orderIds },
      after: { snapshot: next.snapshot, sourceFingerprint: next.sourceFingerprint, orderIds: next.orderIds },
      vendorId: row.vendorId, sourceKey: row.sourceKey,
    });
    await tx.update(vendorSubmissionsTable).set({
      snapshot: next.snapshot, sourceFingerprint: next.sourceFingerprint, orderIds: next.orderIds, updatedAt: new Date(),
    }).where(eq(vendorSubmissionsTable.id, row.id));
    return { ok: true };
  }
  return {
    previewToken,
    before: publicVendorOrder(row, true, []),
    after: publicVendorOrder({ ...row, snapshot: next.snapshot }, false, []),
  };
}
