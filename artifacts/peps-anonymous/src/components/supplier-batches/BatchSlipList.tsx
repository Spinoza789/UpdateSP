import React from "react";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import type { DispatchOrder } from "@/components/AdminDispatch";
import type { SupplierBatch } from "@/lib/supplier-batches";

export const isDispatched = (order: DispatchOrder) => ["Shipped", "Completed"].includes(order.status);

// One slip per order in the batch, carrying only what that batch allocates to it.
// Never falls back to the full order quantities.
export function batchSlips(batch: SupplierBatch, currentOrders: Map<string, DispatchOrder>): DispatchOrder[] {
  return batch.snapshot.orders.flatMap(allocation => {
    const order = currentOrders.get(allocation.id);
    const lineItems = allocation.items.filter(item => Number(item.quantity) > 0)
      .map(item => ({ productName: item.productName, quantity: Number(item.quantity) }));
    return order && lineItems.length ? [{ ...order, lineItems, supplierBatchReferences: [batch.reference] }] : [];
  });
}
const kitCount = (slips: DispatchOrder[]) => slips.reduce((sum, order) => sum + order.lineItems.reduce((n, item) => n + item.quantity, 0), 0);

/** The batches of one group buy, each with a button that prints a slip for every order in it. */
export function BatchSlipList({ batches, orders, statusFilter, onStatusFilter, loading, error, onRefresh, onPrint, onChooseOrders }: {
  batches: SupplierBatch[];
  orders: DispatchOrder[];
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onPrint: (print: { reference: string; orders: DispatchOrder[] }) => void;
  /** When given, each batch offers a link to pick individual orders instead. */
  onChooseOrders?: (batchId: string) => void;
}) {
  const fieldClass = "h-10 rounded-lg border border-input bg-background px-3 text-sm";
  const currentOrders = new Map(orders.map(order => [order.id, order]));
  const rows = batches.map(batch => {
    const all = batchSlips(batch, currentOrders);
    return { batch, all, slips: statusFilter === "all" ? all : all.filter(order => !isDispatched(order)) };
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background p-4">
        <p className="min-w-0 flex-1 basis-64 text-sm text-muted-foreground">One press prints a slip for every order in a batch. Each slip lists only the kits that batch allocates to the order. Printing does not mark orders as dispatched or notify members.</p>
        <label className="grid gap-1 text-xs font-medium">Status
          <select aria-label="Batch slip status" className={fieldClass} value={statusFilter} onChange={e => onStatusFilter(e.target.value)}>
            <option value="pending">Not dispatched</option>
            <option value="all">All orders</option>
          </select>
        </label>
        <button type="button" aria-label="Refresh batches" className={`${fieldClass} flex items-center gap-2`} disabled={loading} onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-border">
        {loading ? <p className="flex items-center gap-2 p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading batches…</p>
          : error ? <p className="p-4 text-sm text-muted-foreground">Batches could not be loaded.</p>
          : rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">This group buy has no prepared or submitted batches yet. Batches are created in the Supplier batches tab.</p>
          : <ul className="divide-y divide-border">
            {rows.map(({ batch, all, slips }) => (
              <li key={batch.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm" data-testid={`packing-slip-batch-${batch.id}`}>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="break-words font-semibold">{batch.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.snapshot.region?.name ?? "Region not set"} · {batch.state === "ordered" ? "Submitted to vendor" : "Prepared"} · {all.length} order{all.length === 1 ? "" : "s"} · {kitCount(all)} kit{kitCount(all) === 1 ? "" : "s"}
                    {statusFilter !== "all" && slips.length !== all.length && ` · ${all.length - slips.length} already dispatched`}
                  </p>
                </div>
                {onChooseOrders && (
                  <button type="button" className="min-h-11 px-1 text-sm font-semibold underline" onClick={() => onChooseOrders(batch.id)}>
                    Choose orders
                  </button>
                )}
                <button type="button" disabled={slips.length === 0} aria-label={`Print packing slips for ${batch.reference}`}
                  onClick={() => onPrint({ reference: batch.reference, orders: slips })}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">
                  <Printer className="h-4 w-4" /> Print slips ({slips.length})
                </button>
              </li>
            ))}
          </ul>}
      </div>
    </div>
  );
}
