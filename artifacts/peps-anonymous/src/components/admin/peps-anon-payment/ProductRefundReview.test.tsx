import { act, createElement } from "react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
// @ts-expect-error Existing workspace test harness.
import { JSDOM } from "../../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

let createRoot: typeof import("react-dom/client").createRoot;
let ProductRefundReview: typeof import("./ProductRefundReview").ProductRefundReview;
let dom: JSDOM;
beforeAll(async () => {
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
  for (const key of ["window", "document", "HTMLElement", "HTMLTextAreaElement", "HTMLInputElement", "Event", "Node", "navigator"])
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  createRoot = (await import("react-dom/client")).createRoot;
  ProductRefundReview = (await import("./ProductRefundReview")).ProductRefundReview;
});
let root: ReturnType<typeof createRoot>;
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ""; });
afterAll(() => dom.window.close());
it("requires a preview before confirming and refreshes reports after saving", async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const calls: any[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: init?.body && JSON.parse(String(init.body)) });
    if (!init) return { refundId: "r1", orderId: "o1", amountUsd: "80.00", reviewed: false,
      submissions: [{ id: "s1", vendorId: "v1", reference: "Shared 1", reason: null,
        lines: [{ productName: "A", quantity: 1, salesUsd: "50.00" }] }] };
    return calls.length === 2 ? { reviewToken: "token", review: { productRefundUsd: "0.00", nonProductRefundUsd: "80.00" } } : { ok: true };
  });
  const saved = vi.fn();
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(ProductRefundReview, {
    refunds: [{ refundId: "r1", orderId: "o1", amountUsd: "80.00" }], request, onSaved: saved,
  })));
  const click = async (id: string) => act(async () => (document.querySelector(`[data-testid="${id}"]`) as HTMLElement).click());
  await click("review-product-refund-r1");
  expect(document.body.textContent).toContain("Shared 1");
  expect(document.querySelector('[data-testid="confirm-product-refund"]')).toBeNull();
  // Use the native setter so React observes the controlled textarea change.
  const note = document.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(note, "Reviewed: shipping and fees only");
    note.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("preview-product-refund");
  expect(document.body.textContent).toContain("$80.00");
  await click("confirm-product-refund");
  expect(calls[1].body).toEqual({ allocations: [], note: "Reviewed: shipping and fees only" });
  expect(calls[2].body.reviewToken).toBe("token");
  expect(saved).toHaveBeenCalledOnce();
});
