import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { vendorSubmissionsTable, groupBuyRefundsTable } from "@workspace/db";
import { aggregateProfitReport, londonReportRange } from "./vendor-profit-report";
import { preloadVendorSources } from "./vendor-source-reads";
import { inspectVendorSubmission } from "./vendor-portal-service";
import { vendorProductProfit } from "./vendor-payment-profit";

/** No wallets or receipts are joined: each supplier submission contributes once. */
export async function vendorProfitReport(tx: any, vendorId: string | undefined, from: string, to: string) {
  const range = londonReportRange(from, to);
  const rows = await tx.select().from(vendorSubmissionsTable).where(and(
    gte(vendorSubmissionsTable.submittedAt, range.start), lt(vendorSubmissionsTable.submittedAt, range.end),
    vendorId ? eq(vendorSubmissionsTable.vendorId, vendorId) : undefined,
  ));
  const reads = await preloadVendorSources(tx, rows);
  const ids = [...new Set<string>(rows.flatMap((row: any) => row.orderIds ?? []))];
  const refunds: any[] = ids.length ? await tx.select({ orderId: groupBuyRefundsTable.orderId, status: groupBuyRefundsTable.status })
    .from(groupBuyRefundsTable).where(inArray(groupBuyRefundsTable.orderId, ids)) : [];
  const affected = new Set(refunds.filter(refund => !["rejected", "cancelled", "canceled"].includes(refund.status)).map(refund => refund.orderId));
  const orders = [];
  for (const row of rows) {
    const sourceOrders = row.orderIds.map((id: string) => reads.orders.get(id)).filter(Boolean);
    const cancelled = sourceOrders.some((order: any) => order.deletedAt || ["Cancelled", "Canceled"].includes(order.status));
    const refundAffected = row.orderIds.some((id: string) => affected.has(id)) ||
      sourceOrders.some((order: any) => order.paymentStatus === "refunded");
    const inspection = await inspectVendorSubmission(tx, row, reads);
    orders.push({ ...row, status: cancelled ? "Cancelled" : row.status, refundAffected,
      profit: vendorProductProfit(row, inspection.source, inspection.stale) });
  }
  return aggregateProfitReport(orders, from, to);
}
