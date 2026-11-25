import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildOrderBatchIndex, OrderBatchBadge, OrderBatchFilter, OrderDispatchFilter, matchesOrderBatch, matchesOrderDispatchStatus, visibleOrderSelection } from "./OrderBatchFilter";
import type { SupplierData } from "@/lib/supplier-batches";

const data = {
  config: { enabled: true },
  batches: [
    { id: "b1", reference: "GB-001", state: "ordered", exceptions: [], snapshot: { orders: [{ id: "split" }] } },
    { id: "b2", reference: "GB-002", state: "prepared", exceptions: [], snapshot: { orders: [{ id: "split" }] } },
    { id: "old", reference: "GB-OLD", state: "released", exceptions: [], snapshot: { orders: [{ id: "released" }] } },
  ],
  proposals: [{
    region: { id: "gb", name: "United Kingdom" },
    orders: [{ id: "open" }, { id: "split" }],
    allQueued: { orders: [{ id: "open" }, { id: "later" }] },
  }],
} as unknown as SupplierData;

describe("order row batch labels", () => {
  it("filters named, open, queued and unallocated orders using exact server allocations", () => {
    const index = buildOrderBatchIndex(data);
    expect(matchesOrderBatch(index, "b1", "split")).toBe(true);
    expect(matchesOrderBatch(index, "b2", "split")).toBe(true);
    expect(matchesOrderBatch(index, "old", "released")).toBe(false);
    expect(matchesOrderBatch(index, "open", "open")).toBe(true);
    expect(matchesOrderBatch(index, "open", "later")).toBe(false);
    expect(matchesOrderBatch(index, "open:gb:1", "open")).toBe(true);
    expect(matchesOrderBatch(index, "queued", "later")).toBe(true);
    expect(matchesOrderBatch(index, "queued", "open")).toBe(false);
    expect(matchesOrderBatch(index, "unallocated", "unpaid")).toBe(true);
    expect(matchesOrderBatch(index, "unallocated", "split")).toBe(false);
    expect(matchesOrderBatch(index, "all", "unpaid", "split")).toBe(false);
    expect(matchesOrderBatch(index, "b1", "split", "split")).toBe(true);
  });

  it("shows organiser batch choices even before any batch is saved", () => {
    const index = buildOrderBatchIndex({ ...data, batches: [] });
    const markup = renderToStaticMarkup(<OrderBatchFilter alwaysVisible includeOpenBatches model={{
      ...index, filter: "all", requestedOrderId: "", error: false, loading: false, setFilter: () => {},
    } as any} />);
    expect(markup).toContain("Supplier batch filter");
    expect(markup).toContain("All open batches");
    expect(markup).toContain("Open batch");
    expect(markup).toContain("Queued for next batch");
    expect(markup).toContain("Not in a saved batch");
  });
  it("preserves the Admin selector's existing named-batch-only choices", () => {
    const index = buildOrderBatchIndex(data);
    const model = { ...index, filter: "all", requestedOrderId: "", error: false, loading: false, setFilter: () => {} };
    const markup = renderToStaticMarkup(<OrderBatchFilter model={model as any} />);
    expect(markup).toContain("GB-001");
    expect(markup).not.toContain("All open batches");
    expect(renderToStaticMarkup(<OrderBatchFilter model={{ ...model, batches: [] } as any} />)).toBe("");
  });

  it("does not mislabel another open proposal as merely queued", () => {
    const extra = {
      ...data.proposals[0], openBatchNumber: 2, orders: [{ id: "later" }],
    };
    const index = buildOrderBatchIndex({ ...data, proposals: [...data.proposals, extra] } as SupplierData);
    expect(matchesOrderBatch(index, "open:gb:2", "later")).toBe(true);
    expect(matchesOrderBatch(index, "queued", "later")).toBe(false);
  });

  it("keeps every active assigned batch, including split allocations", () => {
    const index = buildOrderBatchIndex(data);
    expect(index.batchesByOrder.get("split")?.map(b => b.id)).toEqual(["b1", "b2"]);
    expect(index.labels.get("split")).toContain("GB-001 · ordered");
    expect(index.labels.get("split")).toContain("GB-002 · prepared");
    expect(index.labels.get("released")).toBeUndefined();
  });

  it("distinguishes the actual open batch from later queued orders and unpaid orders", () => {
    const index = buildOrderBatchIndex(data);
    expect(index.labels.get("open")).toBe("Open batch · United Kingdom");
    expect(index.labels.get("later")).toBe("Queued for next batch · United Kingdom");
    expect(index.labels.get("unpaid")).toBeUndefined();
    expect(index.labels.get("split")).toContain("Open batch · United Kingdom");
  });

  it("does not imply orders are in an open batch when batching is disabled", () => {
    const index = buildOrderBatchIndex({ ...data, config: { ...data.config, enabled: false } });
    expect(index.labels.get("open")).toBeUndefined();
    expect(index.labels.get("split")).toContain("GB-001");
  });

  it("renders the same batch labels used by the organiser order list", () => {
    const index = buildOrderBatchIndex(data);
    const markup = renderToStaticMarkup(<OrderBatchBadge model={index as any} orderId="open" />);
    expect(markup).toContain("Open batch · United Kingdom");
    expect(renderToStaticMarkup(<OrderBatchBadge model={index as any} orderId="unpaid" />)).toBe("");
  });
});

describe("organiser dispatch filtering", () => {
  it.each(["Submitted", "Processing", "pending", "paid"])("includes %s in awaiting dispatch", status => {
    expect(matchesOrderDispatchStatus(status, "awaiting")).toBe(true);
    expect(matchesOrderDispatchStatus(status, "dispatched")).toBe(false);
  });
  it.each(["Shipped", "dispatched"])("keeps %s separate from delivered and awaiting", status => {
    expect(matchesOrderDispatchStatus(status, "dispatched")).toBe(true);
    expect(matchesOrderDispatchStatus(status, "awaiting")).toBe(false);
    expect(matchesOrderDispatchStatus(status, "delivered")).toBe(false);
  });
  it.each(["Delivered", "Complete", "Completed"])("recognises terminal state %s", status => {
    expect(matchesOrderDispatchStatus(status, "delivered")).toBe(true);
    expect(matchesOrderDispatchStatus(status, "awaiting")).toBe(false);
  });
  it.each(["Cancelled", "Draft"])("does not suggest %s is waiting for dispatch", status => {
    expect(matchesOrderDispatchStatus(status, "awaiting")).toBe(false);
    expect(matchesOrderDispatchStatus(status, "all")).toBe(true);
  });
  it("renders the independent dispatch-status selector", () => {
    const markup = renderToStaticMarkup(<OrderDispatchFilter value="all" onChange={() => {}} />);
    for (const label of ["Dispatch status filter", "All dispatch statuses", "Awaiting dispatch", "Dispatched", "Delivered"]) {
      expect(markup).toContain(label);
    }
  });
  it("retains selections only within the current batch and dispatch results", () => {
    const index = buildOrderBatchIndex(data);
    const rows = [{ id: "split", status: "Processing" }, { id: "other", status: "Shipped" }];
    const visible = rows.filter(order => matchesOrderBatch(index, "b1", order.id)
      && matchesOrderDispatchStatus(order.status, "awaiting"));
    expect(visibleOrderSelection(["split", "other", "hidden"], visible)).toEqual(["split"]);
    expect(visibleOrderSelection(new Set(["other"]), visible)).toEqual([]);
  });
});
