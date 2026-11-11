import { beforeAll, afterEach, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://app.example/sleepingpepisadmin/janoshik-receiver?mode=bulk",
});
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node", "location", "history"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { createElement, act } = await import("react");
const { createRoot } = await import("react-dom/client");
let Receiver: typeof import("./JanoshikReceiver").default;
let root: Root;
let host: HTMLDivElement;
const opener = { postMessage: vi.fn() };
beforeAll(async () => { Receiver = (await import("./JanoshikReceiver")).default; });
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.document.body.innerHTML = "";
  vi.useRealTimers();
  vi.clearAllMocks();
});
async function render(connectedOpener: unknown = opener) {
  Object.defineProperty(dom.window, "opener", { configurable: true, value: connectedOpener });
  host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(Receiver)));
}
async function hello(origin: string, source: unknown = opener) {
  await act(async () => dom.window.dispatchEvent(new dom.window.MessageEvent("message", {
    origin, source: source as Window,
    data: { type: "janoshik-bulk-hello", secret: "" },
  })));
}
it("explains a missing opener instead of waiting forever", async () => {
  await render(null);
  expect(host.textContent).toContain("No Janoshik tab is connected");
  expect(host.textContent).toContain("click your Bulk import bookmark again");
});
it.each(["https://janoshik.com", "https://www.janoshik.com", "https://verify.janoshik.com"])(
  "connects and acknowledges only the original Janoshik tab: %s", async origin => {
    await render();
    await hello(origin);
    expect(host.textContent).toContain("Connected to your Janoshik tab");
    expect(opener.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "janoshik-bulk-ack", runId: expect.any(String) }), origin);
  },
);
it.each(["https://evil.example", "https://janoshik.com.evil.example", "http://janoshik.com", "null"])(
  "rejects an untrusted opener origin: %s", async origin => {
    await render();
    await hello(origin);
    expect(host.textContent).not.toContain("Connected to your Janoshik tab");
    expect(opener.postMessage).not.toHaveBeenCalled();
  },
);
it("rejects a different window even when its origin is Janoshik", async () => {
  await render();
  await hello("https://janoshik.com", { postMessage: vi.fn() });
  expect(opener.postMessage).not.toHaveBeenCalled();
});
it("shows a recovery instruction when the worker never connects", async () => {
  vi.useFakeTimers();
  await render();
  await act(async () => { vi.advanceTimersByTime(35_000); });
  expect(host.textContent).toContain("Could not connect to your Janoshik tab");
  expect(host.textContent).toContain("click your Bulk import bookmark again");
  await hello("https://janoshik.com");
  expect(host.textContent).toContain("Connected to your Janoshik tab");
  expect(host.textContent).not.toContain("Could not connect");
});
it.each([
  ["https://evil.example", false],
  ["https://verify.janoshik.com", true],
])("also validates the opener origin for single reports: %s", async (origin, accepted) => {
  dom.window.history.replaceState(null, "", "/sleepingpepisadmin/janoshik-receiver");
  try {
    await render();
    await act(async () => dom.window.dispatchEvent(new dom.window.MessageEvent("message", {
      origin, source: opener as unknown as Window,
      data: { type: "janoshik-helper-payload", secret: "", images: [] },
    })));
    expect(host.textContent).toContain(accepted ? "No readable report image was received." : "Waiting for the report");
  } finally {
    dom.window.history.replaceState(null, "", "/sleepingpepisadmin/janoshik-receiver?mode=bulk");
  }
});
