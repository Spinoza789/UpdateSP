import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { PackingSlipsPanel } = await import("./PackingSlipsPanel");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

function button(root: ParentNode, text: string) {
  const found = [...root.querySelectorAll("button")].find(el => el.textContent?.trim() === text || el.getAttribute("aria-label") === text);
  expect(found, text).toBeTruthy();
  return found!;
}
async function select(root: ParentNode, label: string, value: string) {
  const el = root.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
  expect(el).toBeTruthy();
  await React.act(async () => { el.value = value; el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
}

it("offers a dedicated packing slips tab inside Admin group-buy detail", () => {
  const source = readFileSync(new URL("../GbDetailShell.tsx", import.meta.url), "utf8");
  expect(source).toContain('id: "packing-slips", label: "Packing slips"');
  expect(source).toContain('<PackingSlipsPanel key={currentGb.id} secret={secret} groupBuyId={currentGb.id} groupBuyName={currentGb.name}');
});

it("loads all pages, filters countries and unassigned reshippers, and prints only selected visible orders without dispatching", async () => {
  const base = { status: "Submitted", telegramUsername: "example", deliveryMethod: "Post", shippingAddress: "Example Street", lineItems: [{ productName: "Example product", quantity: 2 }] };
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    const url = new URL(String(input), "https://example.test");
    if (url.pathname.endsWith("/supplier-batches")) return Response.json({ batches: [] });
    expect(url.pathname).toBe("/api/admin/orders");
    expect(url.searchParams.get("groupBuyId")).toBe("gb-example");
    expect(options?.headers).toEqual({ "x-admin-secret": "test-admin" });
    expect(options?.method ?? "GET").toBe("GET");
    return { ok: true, json: async () => ({
      orders: url.searchParams.get("page") === "1" ? [
        { ...base, id: "one", code: "10001", shippingCountry: "GB", reshipperUsername: null, shippingName: "Unassigned recipient" },
        { ...base, id: "two", code: "10002", shippingCountry: "Germany", reshipperUsername: "@ExampleLead", shippingName: "Assigned recipient" },
      ] : [{ ...base, id: "three", code: "10003", shippingCountry: "United Kingdom", reshipperUsername: "examplelead", shippingName: "Third recipient" }],
      pagination: { totalPages: 2 },
    }) } as Response;
  });
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<PackingSlipsPanel secret="test-admin" groupBuyId="gb-example" groupBuyName="Example GB" />); });
    expect(request).toHaveBeenCalledTimes(3);
    expect(el.textContent).toContain("Third recipient");
    await select(el, "Country", "United Kingdom");
    expect(el.textContent).not.toContain("Assigned recipient");
    await select(el, "Reshipper", "__none__");
    expect(el.textContent).toContain("Unassigned recipient");
    expect(el.textContent).not.toContain("Third recipient");
    await React.act(async () => { button(el, "Select all filtered").click(); });
    await React.act(async () => { button(el, "Print Packing Slips (1)").click(); });
    const modal = button(el, "Print / Save PDF").closest(".fixed")!;
    expect(modal.textContent).toContain("Unassigned recipient");
    expect(modal.textContent).toContain("Example product");
    expect(modal.textContent).not.toContain("Third recipient");
    await React.act(async () => { button(el, "Close packing slips").click(); });
    await select(el, "Reshipper", "examplelead");
    expect(button(el, "Print Packing Slips (0)").disabled).toBe(true);
    expect(el.textContent).toContain("Third recipient");
    expect(request).toHaveBeenCalledTimes(3);
  } finally { await React.act(async () => root.unmount()); }
});

it("prints only selected-batch allocations with its reference, preserves unassigned orders and clears hidden selections", async () => {
  const base = { status: "Submitted", telegramUsername: "example", deliveryMethod: "Post", shippingCountry: "GB", reshipperUsername: null,
    shippingName: "Batch recipient", lineItems: [{ productName: "HGH full order", quantity: 12 }] };
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    expect(options?.method ?? "GET").toBe("GET");
    expect(options?.headers).toEqual({ "x-admin-secret": "test-admin" });
    return Response.json(String(input).includes("/supplier-batches") ? { batches: [
      { id: "batch-one", reference: "GB-UAJBM / 001", state: "ordered", snapshot: { region: { name: "United Kingdom" }, orders: [
        { id: "one", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 2 }] },
      ] } },
      { id: "batch-two", reference: "GB-UAJBM / 002", state: "prepared", snapshot: { region: { name: "United Kingdom" }, orders: [
        { id: "one", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 10 }] },
      ] } },
      { id: "released", reference: "Released batch", state: "released", snapshot: { orders: [] } },
    ] } : { orders: [{ ...base, id: "one", code: "10001" }, { ...base, id: "two", code: "10002", shippingName: "Outside batch" }] });
  });
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<PackingSlipsPanel secret="test-admin" groupBuyId="gb-example" groupBuyName="HGH GB" />); });
    await select(el, "Batch", "batch-one");
    expect(el.textContent).not.toContain("Outside batch");
    expect(el.textContent).not.toContain("Released batch");
    await React.act(async () => { button(el, "Select all filtered").click(); });
    await React.act(async () => { button(el, "Print Packing Slips (1)").click(); });
    const modal = button(el, "Print / Save PDF").closest(".fixed")!;
    expect(modal.querySelector(".slip-batches")?.textContent).toBe("Batch: GB-UAJBM / 001");
    expect(modal.textContent).toContain("GB-UAJBM / 001");
    expect(modal.textContent).toContain("HGH 36IU");
    expect(modal.textContent).not.toContain("HGH full order");
    expect(modal.textContent).toContain("Total Kits — 2");
    expect(modal.textContent).not.toContain("Total Kits — 12");
    await React.act(async () => { button(modal, "4×6 Labels").click(); });
    expect(modal.querySelector(".slip-batches")?.textContent).toBe("Batch: GB-UAJBM / 001");
    expect(modal.textContent).toContain("GB-UAJBM / 001");
    expect(modal.textContent).toContain("HGH 36IU");
    expect(modal.textContent).not.toContain("HGH full order");
    await React.act(async () => { button(el, "Close packing slips").click(); });
    await select(el, "Batch", "batch-two");
    expect(button(el, "Print Packing Slips (0)").disabled).toBe(true);
    await React.act(async () => { button(el, "Select all filtered").click(); });
    await React.act(async () => { button(el, "Print Packing Slips (1)").click(); });
    expect(button(el, "Print / Save PDF").closest(".fixed")!.textContent).toContain("Total Kits — 10");
    await React.act(async () => { button(el, "Close packing slips").click(); });
    await select(el, "Batch", "");
    await React.act(async () => { button(el, "Select all filtered").click(); });
    await React.act(async () => { button(el, "Print Packing Slips (2)").click(); });
    const allModal = button(el, "Print / Save PDF").closest(".fixed")!;
    for (const format of ["A4 Landscape", "4×6 Labels"]) {
      await React.act(async () => { button(allModal, format).click(); });
      const slips = allModal.querySelectorAll(".slip");
      expect(slips).toHaveLength(2);
      expect(slips[0].querySelector(".slip-batches")?.textContent).toBe("Batches: GB-UAJBM / 001 · GB-UAJBM / 002");
      expect(slips[1].querySelector(".slip-batches")).toBeNull();
      expect(slips[0].textContent).toContain("HGH full order");
      expect(slips[0].textContent).toContain("Total Kits — 12");
    }
    expect(request).toHaveBeenCalledTimes(2);
  } finally { await React.act(async () => root.unmount()); }
});

it("has a Batches tab that prints every order in one batch with only that batch's kits", async () => {
  const base = { telegramUsername: "example", deliveryMethod: "Post", shippingCountry: "GB", reshipperUsername: null,
    lineItems: [{ productName: "HGH full order", quantity: 12 }] };
  vi.spyOn(globalThis, "fetch").mockImplementation(async input => Response.json(String(input).includes("/supplier-batches") ? { batches: [
    { id: "batch-one", reference: "GB-UAJBM / 001", state: "ordered", snapshot: { region: { name: "United Kingdom" }, orders: [
      { id: "one", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 2 }] },
      { id: "two", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 3 }] },
      { id: "sent", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 1 }] },
    ] } },
    { id: "batch-two", reference: "GB-UAJBM / 002", state: "prepared", snapshot: { region: { name: "Europe" }, orders: [
      { id: "one", items: [{ productId: "hgh", productName: "HGH 36IU", quantity: 10 }] },
    ] } },
    { id: "released", reference: "Released batch", state: "released", snapshot: { orders: [] } },
  ] } : { orders: [
    { ...base, id: "one", code: "10001", status: "Submitted", shippingName: "First recipient" },
    { ...base, id: "two", code: "10002", status: "Submitted", shippingName: "Second recipient" },
    { ...base, id: "sent", code: "10003", status: "Shipped", shippingName: "Already sent" },
    { ...base, id: "outside", code: "10004", status: "Submitted", shippingName: "Outside batch" },
  ] }));
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<PackingSlipsPanel secret="test-admin" groupBuyId="gb-example" groupBuyName="HGH GB" />); });
    const tabs = [...el.querySelectorAll('[role="tab"]')] as HTMLElement[];
    expect(tabs.map(tab => tab.textContent)).toEqual(["Orders", "Batches (2)"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    await React.act(async () => { tabs[1].click(); });
    expect(el.querySelector('select[aria-label="Batch"]')).toBeNull();
    const first = el.querySelector('[data-testid="packing-slip-batch-batch-one"]')!;
    expect(first.textContent).toContain("GB-UAJBM / 001");
    expect(first.textContent).toContain("United Kingdom · Submitted to vendor · 3 orders · 6 kits · 1 already dispatched");
    expect(el.querySelector('[data-testid="packing-slip-batch-batch-two"]')!.textContent).toContain("Europe · Prepared · 1 order · 10 kits");
    expect(el.textContent).not.toContain("Released batch");

    await React.act(async () => { button(first, "Print slips (2)").click(); });
    const modal = button(el, "Print / Save PDF").closest(".fixed")!;
    const slips = modal.querySelectorAll(".slip");
    expect(slips).toHaveLength(2);
    expect(slips[0].querySelector(".slip-batches")?.textContent).toBe("Batch: GB-UAJBM / 001");
    expect(modal.textContent).toContain("Total Kits — 2");
    expect(modal.textContent).toContain("Total Kits — 3");
    expect(modal.textContent).not.toContain("HGH full order");
    expect(modal.textContent).not.toContain("Already sent");
    expect(modal.textContent).not.toContain("Outside batch");
    await React.act(async () => { button(el, "Close packing slips").click(); });

    // Including dispatched orders adds the third slip.
    await select(el, "Batch slip status", "all");
    await React.act(async () => { button(el.querySelector('[data-testid="packing-slip-batch-batch-one"]')!, "Print slips (3)").click(); });
    expect(button(el, "Print / Save PDF").closest(".fixed")!.querySelectorAll(".slip")).toHaveLength(3);
    await React.act(async () => { button(el, "Close packing slips").click(); });

    // "Choose orders" opens the Orders tab already filtered to that batch.
    await React.act(async () => { button(el.querySelector('[data-testid="packing-slip-batch-batch-two"]')!, "Choose orders").click(); });
    expect((el.querySelector('select[aria-label="Batch"]') as HTMLSelectElement).value).toBe("batch-two");
    expect(el.textContent).toContain("First recipient");
    expect(el.textContent).not.toContain("Second recipient");
  } finally { await React.act(async () => root.unmount()); }
});

it("shows an error and does not allow printing a partial failed load", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "Session expired" }) } as Response);
  const el = document.createElement("div");
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<PackingSlipsPanel secret="test-admin" groupBuyId="gb-example" groupBuyName="Example GB" />); });
    expect(el.textContent).toContain("Session expired");
    expect(button(el, "Print Packing Slips (0)").disabled).toBe(true);
  } finally { await React.act(async () => root.unmount()); }
});
