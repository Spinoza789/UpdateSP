import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildOrderBatchIndex, OrderBatchBadge } from "./OrderBatchFilter";
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
