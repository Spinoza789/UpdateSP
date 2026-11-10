// @ts-expect-error jsdom is supplied by the workspace without declarations.
import { JSDOM } from "jsdom";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WholesalePriceCsv } from "./WholesalePriceCsv";

let root: Root;
beforeAll(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://test.local" });
  Object.assign(globalThis, { React, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ""; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
const plan = { rows: 2, unchanged: 1, previewToken: "a".repeat(64), applied: false,
  changes: [{ id: "p", name: "Product", beforeCost: null, beforePrice: "20.00", cost: "7.00", price: "25.00" }] };
async function mount(onApplied = vi.fn()) {
  const el = document.createElement("div"); document.body.append(el); root = createRoot(el);
  await act(async () => root.render(<WholesalePriceCsv secret="fixture" vendorId="jbg" vendorName="JBG/YT" onApplied={onApplied} />));
  return el;
}
async function choose(el: HTMLElement) {
  const file = { name: "prices.csv", size: 120, text: async () => "CSV CONTENT" };
  const input = el.querySelector("input[type=file]")!;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new window.Event("change", { bubbles: true })); await new Promise(r => setTimeout(r, 10)); });
}
it("reviews both prices without applying until confirmed, then refreshes the product list", async () => {
  const applied = vi.fn();
  const fetcher = vi.fn(async (_url, init) => response(JSON.parse(init.body).apply ? { ...plan, applied: true, updated: 1 } : plan));
  vi.stubGlobal("fetch", fetcher);
  const el = await mount(applied);
  await choose(el);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ vendorId: "jbg", csv: "CSV CONTENT", apply: false });
  expect(el.textContent).toContain("7.00");
  expect(el.textContent).toContain("25.00");
  expect(applied).not.toHaveBeenCalled();
  await act(async () => (el.querySelector('[data-testid="apply-wholesale-price-csv"]') as HTMLElement).click());
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ apply: true, previewToken: plan.previewToken });
  expect(applied).toHaveBeenCalledOnce();
  expect(el.textContent).toMatch(/updated 1 product/i);
});
it("clears a stale apply action and requires a fresh review", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => JSON.parse(init.body).apply
    ? response({ error: "Prices changed; review again." }, 409) : response(plan)));
  const el = await mount(); await choose(el);
  await act(async () => (el.querySelector('[data-testid="apply-wholesale-price-csv"]') as HTMLElement).click());
  expect(el.textContent).toContain("Prices changed");
  expect(el.querySelector('[data-testid="apply-wholesale-price-csv"]')).toBeNull();
  expect(el.textContent).toContain("Review CSV again");
});
it("downloads the complete selected supplier list from the server, not filtered browser rows", async () => {
  const file = new Blob(["prices"]);
  const fetcher = vi.fn(async () => ({ ok: true, blob: async () => file }));
  vi.stubGlobal("fetch", fetcher);
  const created = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:synthetic");
  const clicked = vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const el = await mount();
  await act(async () => (el.querySelector('[data-testid="download-wholesale-price-csv"]') as HTMLElement).click());
  expect(fetcher).toHaveBeenCalledWith("/api/admin/wholesale-products/price-csv?vendorId=jbg",
    { credentials: "include", headers: { "x-admin-secret": "fixture" } });
  expect(created).toHaveBeenCalledWith(file);
  expect(clicked).toHaveBeenCalledOnce();
});
it("rejects oversized files before requesting a preview", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const el = await mount(), input = el.querySelector("input[type=file]")!;
  Object.defineProperty(input, "files", { value: [{ name: "big.csv", size: 1_000_001 }], configurable: true });
  await act(async () => { input.dispatchEvent(new window.Event("change", { bubbles: true })); });
  expect(el.textContent).toContain("up to 1 MB");
  expect(fetcher).not.toHaveBeenCalled();
});
