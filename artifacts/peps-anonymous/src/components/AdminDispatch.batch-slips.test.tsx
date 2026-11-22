import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { DispatchManager } = await import("./AdminDispatch");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

const button = (root: ParentNode, text: string) => {
  const found = [...root.querySelectorAll("button")].find(el => el.textContent?.trim() === text || el.getAttribute("aria-label") === text);
  expect(found, text).toBeTruthy();
  return found!;
};
const settle = () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });

function cfgFor(role: "organiser" | "reshipper", paths: string[]) {
  const base = { telegramUsername: "example", deliveryMethod: "Post", shippingCountry: "GB", reshipperUsername: null,
    lineItems: [{ productName: "HGH full order", quantity: 12 }] };
  return {
    role, base: `/${role}/dispatch`, gbId: "gb-example",
    ordersPath: (qs: string) => `/${role}/dispatch/orders?${qs}`,
    groupBuysPath: `/${role}/dispatch/group-buys-list`,
    gbParcelsPath: (gbId: string) => `/${role}/dispatch/group-buys/${gbId}/parcels`,
    orderImagesPath: (orderId: string) => `/${role}/dispatch/orders/${orderId}/dispatch-images`,
    dfetch: async (path: string) => {
      paths.push(path);
      if (path.endsWith("/supplier-batches")) return Response.json({ batches: [
        { id: "batch-one", reference: "GB-UAJBM / 001", state: "ordered", snapshot: { region: { name: "United Kingdom" }, orders: [
          { id: "one", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 2 }] },
          { id: "sent", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 1 }] },
        ] } },
        { id: "released", reference: "Released batch", state: "released", snapshot: { orders: [] } },
      ] });
      if (path.includes("/dispatch/orders?")) {
        const page = new URLSearchParams(path.split("?")[1]).get("page");
        return Response.json(page === "1"
          ? { orders: [{ ...base, id: "one", code: "10001", status: "Submitted", shippingName: "First recipient" }], pagination: { totalPages: 2 } }
          : { orders: [{ ...base, id: "sent", code: "10003", status: "Shipped", shippingName: "Already sent" }], pagination: { totalPages: 2 } });
      }
      return Response.json([]);
    },
  };
}

it("gives organisers a Batch slips tab that prints one batch's orders with only that batch's kits", async () => {
  const paths: string[] = [];
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<DispatchManager cfg={cfgFor("organiser", paths)} />); });
    await React.act(async () => { button(el, "Batch slips").click(); });
    await settle();
    // Batches come from the organiser's own route, and every page of orders is loaded.
    expect(paths).toContain("/organiser/group-buys/gb-example/supplier-batches");
    expect(paths.filter(path => path.includes("/organiser/dispatch/orders?groupBuyId=gb-example&page="))).toHaveLength(2);
    const row = el.querySelector('[data-testid="packing-slip-batch-batch-one"]')!;
    expect(row.textContent).toContain("United Kingdom · Submitted to vendor · 2 orders · 3 kits · 1 already dispatched");
    expect(el.textContent).not.toContain("Released batch");
    expect(el.textContent).not.toContain("Choose orders");

    await React.act(async () => { button(row, "Print slips (1)").click(); });
    const modal = button(el, "Print / Save PDF").closest(".fixed")!;
    expect(modal.querySelectorAll(".slip")).toHaveLength(1);
    expect(modal.querySelector(".slip-batches")?.textContent).toBe("Batch: GB-UAJBM / 001");
    expect(modal.textContent).toContain("Total Kits — 2");
    expect(modal.textContent).not.toContain("HGH full order");
    expect(modal.textContent).not.toContain("Already sent");
  } finally { await React.act(async () => root.unmount()); }
});

it("does not offer the Batch slips tab to reshippers", async () => {
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<DispatchManager cfg={cfgFor("reshipper", [])} />); });
    expect([...el.querySelectorAll("button")].some(b => b.textContent?.trim() === "Batch slips")).toBe(false);
  } finally { await React.act(async () => root.unmount()); }
});
