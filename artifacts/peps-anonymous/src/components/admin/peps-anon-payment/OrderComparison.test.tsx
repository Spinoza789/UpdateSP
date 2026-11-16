import { act, createElement } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace test harness.
import { JSDOM } from "../../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace test harness.
import { fireEvent } from "../../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import { londonToday, presetRange } from "./reportDates";

let root: Root | undefined;
let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let OrderComparison: typeof import("./OrderComparison").OrderComparison;
const vendors = [{ id: "vendor-a", name: "Harbour Supply" }, { id: "vendor-b", name: "Northline Goods" }];
const requests: string[] = [];
let respond: (path: string, init?: RequestInit) => Promise<any>;

before(async () => {
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
  for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node", "MutationObserver", "navigator", "HTMLButtonElement"])
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  OrderComparison = (await import("./OrderComparison")).OrderComparison;
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = "";
  requests.length = 0;
});

after(() => dom.window.close());

function el(id: string) {
  const value = document.querySelector(`[data-testid="${id}"]`);
  assert.ok(value, id);
  return value!;
}

async function mount(handler?: typeof respond) {
  respond = handler ?? (async (path) => {
    requests.push(path);
    return reportFor(path);
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(OrderComparison, { vendors, request: respond })));
}

function reportFor(path: string, totals = { current: 12, previous: 8 }) {
  const q = new URL(path, "http://localhost").searchParams;
  const from = q.get("from")!;
  const to = q.get("to")!;
  const compareFrom = q.get("compareFrom")!;
  const compareTo = q.get("compareTo")!;
  const vendorId = q.get("vendorId") ?? null;
  return {
    timeZone: "Europe/London",
    vendorId,
    current: { from, to, total: totals.current, excluded: 2, daily: [{ date: from, count: totals.current }] },
    previous: { from: compareFrom, to: compareTo, total: totals.previous, excluded: 1, daily: [{ date: compareFrom, count: totals.previous }] },
    difference: totals.current - totals.previous,
    percentChange: totals.previous === 0 ? null : (((totals.current - totals.previous) / totals.previous) * 100).toFixed(2),
  };
}

async function click(id: string) {
  await act(async () => fireEvent.click(el(id)));
}

async function change(id: string, value: string) {
  await act(async () => fireEvent.change(el(id), { target: { value } }));
}

test("starts on London calendar month and compares with the immediately prior calendar month", async () => {
  await mount();
  assert.ok(el("orders-comparison"));
  for (const preset of ["daily", "weekly", "monthly", "quarterly", "biannual", "custom"])
    assert.ok(el(`comparison-preset-${preset}`));
  const path = requests[0];
  assert.ok(path.startsWith("/api/admin/vendor-payments/order-comparison?"));
  const q = new URL(path, "http://localhost").searchParams;
  const current = presetRange("monthly", londonToday());
  assert.equal(q.get("from"), current.from);
  assert.equal(q.get("to"), current.to);
  assert.equal(q.get("compareTo"), new Date(Date.parse(`${current.from}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10));
  assert.equal(q.get("vendorId"), null);
  assert.match(el("order-comparison-current-total").textContent!, /12/);
  assert.match(el("order-comparison-difference").textContent!, /\+4/);
  assert.match(el("order-comparison-percent").textContent!, /50\.00%/);
  assert.match(el("order-comparison-current-label").textContent!, new RegExp(`${current.from}.*${current.to}`));
  await click("order-comparison-refresh");
  assert.equal(requests.length, 2);
});

test("selects a vendor and custom comparison dates without changing supplier orders", async () => {
  await mount();
  await click("order-comparison-compare-custom");
  await change("comparison-from", "2025-02-01");
  await change("comparison-to", "2025-02-10");
  await change("comparison-compare-from", "2024-11-20");
  await change("comparison-compare-to", "2024-11-30");
  await change("order-comparison-vendor", "vendor-b");
  const path = requests.at(-1)!;
  const q = new URL(path, "http://localhost").searchParams;
  assert.equal(q.get("from"), "2025-02-01");
  assert.equal(q.get("to"), "2025-02-10");
  assert.equal(q.get("compareFrom"), "2024-11-20");
  assert.equal(q.get("compareTo"), "2024-11-30");
  assert.equal(q.get("vendorId"), "vendor-b");
  assert.match(document.body.textContent!, /Northline Goods/);
  assert.ok(requests.every((url) => url.startsWith("/api/admin/vendor-payments/order-comparison?")));
});

test("shows a zero comparison baseline honestly and warns for future or unequal periods", async () => {
  await mount(async (path) => {
    requests.push(path);
    const result = reportFor(path, { current: 3, previous: 0 });
    return result;
  });
  await click("comparison-preset-custom");
  await change("comparison-from", "2098-12-30");
  await change("comparison-to", "2099-01-01");
  await click("order-comparison-compare-custom");
  await change("comparison-compare-from", "2098-12-20");
  await change("comparison-compare-to", "2098-12-20");
  assert.match(el("order-comparison-percent").textContent!, /New activity/);
  assert.ok(document.querySelector('[data-testid="order-comparison-future-warning"]'));
  assert.ok(document.querySelector('[data-testid="order-comparison-length-warning"]'));
});

test("shows no change for a zero-to-zero baseline without rendering Infinity", async () => {
  await mount(async (path) => {
    requests.push(path);
    return reportFor(path, { current: 0, previous: 0 });
  });
  assert.match(el("order-comparison-percent").textContent!, /No change/);
  assert.ok(el("order-comparison-empty"));
  assert.doesNotMatch(document.body.textContent!, /Infinity|NaN/);
});

test("rejects invalid and over-ten-year ranges before issuing a request", async () => {
  await mount();
  await click("comparison-preset-custom");
  await change("comparison-from", "2020-04-02");
  await change("comparison-to", "2020-04-01");
  assert.ok(el("order-comparison-range-error"));
  const noRequest = requests.length;
  await change("comparison-to", "2030-04-02");
  assert.match(el("order-comparison-range-error").textContent!, /10 years/i);
  assert.equal(requests.length, noRequest);
});

test("does not display malformed or mismatched server ranges and can retry", async () => {
  let malformed = true;
  await mount(async (path) => {
    requests.push(path);
    const result = reportFor(path);
    if (malformed) result.current.from = "2020-01-01";
    return result;
  });
  assert.ok(el("order-comparison-error"));
  assert.equal(document.querySelector('[data-testid="order-comparison-current-total"]'), null);
  malformed = false;
  await click("order-comparison-retry");
  assert.match(el("order-comparison-current-total").textContent!, /12/);
});

test("rejects a response for a different vendor", async () => {
  await mount(async (path) => {
    requests.push(path);
    const result = reportFor(path);
    result.vendorId = "vendor-b";
    return result;
  });
  await change("order-comparison-vendor", "vendor-a");
  assert.ok(el("order-comparison-error"));
  assert.equal(document.querySelector('[data-testid="order-comparison-current-total"]'), null);
});

test("keeps the newest result when requests race and refreshes when focus returns", async () => {
  const pending: Array<(value: any) => void> = [];
  await mount((path) => {
    requests.push(path);
    return new Promise((resolve) => pending.push(resolve));
  });
  await act(async () => window.dispatchEvent(new dom.window.Event("focus")));
  await act(async () => pending[1](reportFor(requests[1], { current: 21, previous: 8 })));
  await act(async () => pending[0](reportFor(requests[0], { current: 2, previous: 8 })));
  assert.match(el("order-comparison-current-total").textContent!, /21/);
  await act(async () => window.dispatchEvent(new dom.window.Event("focus")));
  assert.equal(requests.length, 3);
});
