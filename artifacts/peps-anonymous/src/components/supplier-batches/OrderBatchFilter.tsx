import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supplierKey, supplierRequest, type SupplierScope, type SupplierData, type SupplierBatch } from "@/lib/supplier-batches";

/** Use the server's exact proposed allocations, never infer inclusion from country alone. */
export function buildOrderBatchIndex(data?: SupplierData) {
  const batches = data?.batches.filter(b => b.state !== "released") ?? [];
  const batchesByOrder = new Map<string, SupplierBatch[]>();
  const openBatches: Array<{ id: string; label: string; orderIds: Set<string> }> = [];
  const openOrderIds = new Set<string>();
  const queuedOrderIds = new Set<string>();
  const parts = new Map<string, string[]>();
  const append = (id: string, label: string) => {
    const labels = parts.get(id) ?? [];
    if (!labels.includes(label)) labels.push(label);
    parts.set(id, labels);
  };
  for (const batch of batches) {
    for (const order of batch.snapshot.orders) {
      const assigned = batchesByOrder.get(order.id) ?? [];
      if (!assigned.some(b => b.id === batch.id)) assigned.push(batch);
      batchesByOrder.set(order.id, assigned);
      append(order.id, `${batch.reference} · ${batch.state}${batch.exceptions.length ? " · Review" : ""}`);
    }
  }
  if (data?.config.enabled) {
    for (const proposal of data.proposals) {
      const included = new Set(proposal.orders.map(order => order.id));
      if (included.size) openBatches.push({
        id: `open:${proposal.region.id}:${proposal.openBatchNumber ?? 1}`,
        label: `Open batch${proposal.openBatchNumber ? ` ${proposal.openBatchNumber}` : ""} · ${proposal.region.name}`,
        orderIds: included,
      });
      for (const id of included) {
        openOrderIds.add(id);
        append(id, `Open batch · ${proposal.region.name}`);
      }
    }
    for (const proposal of data.proposals) {
      for (const order of proposal.allQueued?.orders ?? []) {
        if (!openOrderIds.has(order.id)) {
          queuedOrderIds.add(order.id);
          append(order.id, `Queued for next batch · ${proposal.region.name}`);
        }
      }
    }
  }
  const labels = new Map([...parts].map(([id, values]) => [id, values.join(" | ")]));
  const byOrder = new Map([...batchesByOrder].map(([id, assigned]) => [id, assigned[0]]));
  return { batches, batchesByOrder, byOrder, labels, openBatches, openOrderIds, queuedOrderIds };
}

export function matchesOrderBatch(index: ReturnType<typeof buildOrderBatchIndex>, filter: string, id: string, requestedOrderId = "") {
  if (requestedOrderId && requestedOrderId !== id) return false;
  if (filter === "all") return true;
  if (filter === "unallocated") return !index.byOrder.has(id);
  if (filter === "open") return index.openOrderIds.has(id);
  if (filter === "queued") return index.queuedOrderIds.has(id);
  if (filter.startsWith("open:")) return index.openBatches.some(batch => batch.id === filter && batch.orderIds.has(id));
  return index.batchesByOrder.get(id)?.some(batch => batch.id === filter) ?? false;
}

const filterKey = (scope: SupplierScope, id?: string) => `supplier-order-filter:${scope}:${id ?? ""}`;
const savedSelection = (key: string) => {
  try { return { key, filter: sessionStorage.getItem(key) ?? "all", requestedOrderId: sessionStorage.getItem(`${key}:order`) ?? "" }; }
  catch { return { key, filter: "all", requestedOrderId: "" }; }
};
/** Survives switching from the purchasing/fulfilment tab to Orders. */
export function selectSupplierOrderBatch(scope: SupplierScope, id: string, batchId: string, orderId?: string) {
  try {
    sessionStorage.setItem(filterKey(scope, id), batchId);
    if (orderId) sessionStorage.setItem(`${filterKey(scope, id)}:order`, orderId);
    else sessionStorage.removeItem(`${filterKey(scope, id)}:order`);
  } catch {}
  window.dispatchEvent(new CustomEvent("supplier-order-filter", { detail: { scope, id, batchId, orderId } }));
}
export function useOrderBatches(scope: SupplierScope, groupBuyId?: string, headers?: Record<string, string>) {
  const key = filterKey(scope, groupBuyId);
  const [selection, setSelection] = useState(() => savedSelection(key));
  const { filter, requestedOrderId } = selection.key === key ? selection : savedSelection(key);
  useEffect(() => {
    setSelection(savedSelection(key));
    const listener = (event: Event) => {
      const { scope: s, id, batchId, orderId } = (event as CustomEvent).detail ?? {};
      if (s === scope && id === groupBuyId && typeof batchId === "string") {
        setSelection({ key, filter: batchId, requestedOrderId: orderId ?? "" });
      }
    };
    window.addEventListener("supplier-order-filter", listener);
    return () => window.removeEventListener("supplier-order-filter", listener);
  }, [scope, groupBuyId, key]);
  const query = useQuery({
    queryKey: supplierKey(scope, groupBuyId ?? ""),
    queryFn: () => supplierRequest(scope, groupBuyId!, "", undefined, "GET", headers),
    enabled: !!groupBuyId, staleTime: 15_000, refetchInterval: 60_000, refetchIntervalInBackground: false,
  });
  const index = useMemo(() => buildOrderBatchIndex(query.data), [query.data]);
  const changeFilter = useCallback((value: string) => {
    setSelection({ key, filter: value, requestedOrderId: "" });
    try { sessionStorage.setItem(key, value); sessionStorage.removeItem(`${key}:order`); } catch {}
  }, [key]);
  useEffect(() => {
    const known = ["all", "unallocated", "open", "queued"].includes(filter)
      || index.batches.some(batch => batch.id === filter) || index.openBatches.some(batch => batch.id === filter);
    if (query.data && !known) changeFilter("all");
  }, [query.data, index, filter, changeFilter]);
  const matches = useCallback((id: string) => matchesOrderBatch(index, filter, id, requestedOrderId),
    [index, filter, requestedOrderId]);
  return {
    ...index, filter, setFilter: changeFilter, error: query.isError, loading: !!groupBuyId && query.isPending,
    refetch: query.refetch, requestedOrderId, matches,
  };
}
export function OrderBatchFilter({ model, alwaysVisible = false, includeOpenBatches = false, onChange }: {
  model: ReturnType<typeof useOrderBatches>; alwaysVisible?: boolean; includeOpenBatches?: boolean; onChange?: (value: string) => void;
}) {
  if (!alwaysVisible && !model.batches.length && !model.error) return null;
  const known = ["all", "unallocated", ...(includeOpenBatches ? ["open", "queued", ...model.openBatches.map(batch => batch.id)] : [])]
    .includes(model.filter) || model.batches.some(batch => batch.id === model.filter);
  return <label className="inline-flex flex-wrap items-center gap-2 text-xs" style={{color:"var(--t-text)"}}>
    Supplier batch
    <select aria-label="Supplier batch filter" value={model.filter} disabled={model.loading}
      onChange={e => (onChange ?? model.setFilter)(e.target.value)}
      className="rounded-lg border px-3 py-2" style={{background:"var(--t-surface)",borderColor:"var(--t-border)"}}>
      <option value="all">All batches / orders</option>
      <option value="unallocated">{includeOpenBatches ? "Not in a saved batch" : "Not in a batch"}</option>
      {includeOpenBatches && <>
        <option value="open">All open batches</option>
        {model.openBatches.map(batch => <option key={batch.id} value={batch.id}>{batch.label}</option>)}
      </>}
      {includeOpenBatches && <option value="queued">Queued for next batch</option>}
      {model.batches.map(b => <option key={b.id} value={b.id}>{b.reference} · {b.state}</option>)}
      {!known && <option value={model.filter}>Selected batch unavailable</option>}
    </select>
    {model.loading && <span role="status">Loading batches…</span>}
    {model.requestedOrderId && <button type="button" onClick={() => (onChange ?? model.setFilter)(model.filter)} className="text-blue-600 underline">Showing one linked order · Show whole batch</button>}
    {model.error && <span role="alert">Batch details could not be refreshed.</span>}
  </label>;
}

export type DispatchStatusFilter = "all" | "awaiting" | "dispatched" | "delivered";
export function matchesOrderDispatchStatus(status: string, filter: DispatchStatusFilter) {
  const value = status.trim().toLowerCase();
  if (filter === "all") return true;
  if (filter === "delivered") return ["delivered", "complete", "completed"].includes(value);
  if (filter === "dispatched") return ["shipped", "dispatched"].includes(value);
  return !!value && !["shipped", "dispatched", "delivered", "complete", "completed", "cancelled", "draft"].includes(value);
}
export function visibleOrderSelection(selected: Iterable<string>, orders: ReadonlyArray<{ id: string }>) {
  const visible = new Set(orders.map(order => order.id));
  return [...selected].filter(id => visible.has(id));
}
export function OrderDispatchFilter({ value, onChange }: { value: DispatchStatusFilter; onChange: (value: DispatchStatusFilter) => void }) {
  return <label className="inline-flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--t-text)" }}>
    Dispatch status
    <select aria-label="Dispatch status filter" value={value} onChange={event => onChange(event.target.value as DispatchStatusFilter)}
      className="rounded-lg border px-3 py-2" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <option value="all">All dispatch statuses</option>
      <option value="awaiting">Awaiting dispatch</option>
      <option value="dispatched">Dispatched / shipped</option>
      <option value="delivered">Delivered / completed</option>
    </select>
  </label>;
}
export function OrderBatchBadge({ model, orderId }: { model: ReturnType<typeof useOrderBatches>; orderId: string }) {
  const label = model.labels.get(orderId);
  return label ? <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold break-words"
    style={{background:"rgba(45,107,204,.12)",color:"var(--t-blue, #2D6BCC)"}}>{label}</span> : null;
}
