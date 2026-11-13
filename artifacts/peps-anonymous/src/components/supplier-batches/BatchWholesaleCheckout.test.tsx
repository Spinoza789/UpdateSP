import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error Existing workspace browser-test dependency has no declarations.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/gborganiser-v2", pretendToBeVisual: true });
for (const name of ["window", "document", "navigator", "location", "history", "Event", "FocusEvent", "KeyboardEvent", "MouseEvent", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLButtonElement", "SVGElement", "DOMRect", "Element", "Node", "NodeFilter", "DocumentFragment", "MutationObserver", "CustomEvent"] as const) {
  Object.defineProperty(globalThis, name, { value: (dom.window as any)[name], configurable: true, writable: true });
}
Object.assign(globalThis, { getComputedStyle: dom.window.getComputedStyle, IS_REACT_ACT_ENVIRONMENT: true });
for (const method of ["addEventListener", "removeEventListener", "dispatchEvent"] as const) {
  Object.assign(globalThis, { [method]: dom.window[method].bind(dom.window) });
}
const React = await import("react");
Object.assign(globalThis, { React });
const { act, createElement } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
// @ts-expect-error Existing workspace browser-test dependency has no declarations.
const { fireEvent } = await import("../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js");
const { BatchWholesaleCheckout } = await import("./BatchWholesaleCheckout");
const batch = {
  id: "batch", reference: "EU-001", state: "prepared" as const, exceptions: [], createdAt: "", createdBy: "organiser",
  orderedAt: null, releasedAt: null, releaseReason: null,
  snapshot: { region: { id: "it", name: "Italy", countries: ["IT"], targetKits: 2 }, kits: 2,
    orders: [], products: [], token: "batch-token", queuedKits: 2, remainingKits: 0, ready: true, readyAt: null },
};
test("reviews shipping, invalidates changed countries, and submits one linked wholesale checkout", async () => {
  const nativeFetch = globalThis.fetch;
  const posts: any[] = [];
  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const data = String(input).includes("wholesale-preview") ? {
      linkedOrder: null, token: "checkout-token", vendorId: "uther", shippingCountry: body.shippingCountry,
      productSubtotal: 160, vendorShipping: 60, grandTotal: 220, kits: 2,
      lineItems: [{ productId: "p", productName: "Synthetic Reta", quantity: 2, unitPrice: 80, lineTotal: 160 }],
    } : (posts.push(body), { id: "new-order", code: "TEST" });
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["account", "me"], { telegramUsername: "organiser", organiserStatus: "approved" });
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const button = (name: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!;
  const flush = () => new Promise(resolve => setTimeout(resolve, 20));
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(BatchWholesaleCheckout, { batch, groupBuyId: "group", scope: "organiser" }))));
    await act(async () => { fireEvent.click(button("Create wholesale order")); });
    assert.ok(document.querySelector('[role="dialog"]'));
    await act(async () => {
      for (const [name, value] of Object.entries({ shippingName: "Synthetic Name", shippingPhone: "+44123456789",
        shippingEmail: "synthetic@example.invalid", shippingAddress: "Synthetic full address" })) {
        fireEvent.change(document.querySelector(`[name="${name}"]`), { target: { value } });
      }
      fireEvent.click(button("Review products and shipping")); await flush();
    });
    assert.match(document.body.textContent!, /\$220\.00/);
    const place = () => button("Place order & continue to payment") as HTMLButtonElement;
    assert.equal(place().disabled, false);
    await act(async () => { fireEvent.change(document.querySelector('[name="shippingCountry"]'), { target: { value: "GB" } }); });
    assert.equal(place().disabled, true);
    await act(async () => { fireEvent.click(button("Review products and shipping")); await flush(); });
    assert.equal(place().disabled, false);
    await act(async () => { fireEvent.submit(document.querySelector("form")); await flush(); });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].orderType, "wholesale");
    assert.deepEqual(posts[0].supplierBatchCheckout, { groupBuyId: "group", batchId: "batch", token: "checkout-token" });
    assert.equal(posts[0].shippingName, "Synthetic Name");
    assert.equal(dom.window.location.pathname, "/account/orders/new-order");
  } finally {
    await act(async () => root.unmount()); host.remove(); client.clear(); globalThis.fetch = nativeFetch; dom.window.close();
  }
});
