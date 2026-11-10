import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error workspace jsdom
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { WholesaleFreeShipping } = await import("./WholesaleFreeShipping");
let root: ReturnType<typeof createRoot>;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.document.body.innerHTML = "";
  vi.restoreAllMocks();
});
const setInput = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
};
it("saves a scoped threshold, reloads it and explicitly clears to null", async () => {
  const onSaved = vi.fn();
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => ({
    ok: true, json: async () => ({ id: "one", ...JSON.parse(init.body as string) }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  const el = dom.window.document.createElement("div"); document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root.render(createElement(WholesaleFreeShipping, {
    vendor: { id: "one", name: "One", freeShippingThreshold: 500 }, secret: "fixture", onSaved,
  })));
  const input = el.querySelector("input")!;
  expect(input.value).toBe("500");
  await setInput(input, "750");
  await act(async () => el.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/wholesale-vendors/one");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ freeShippingThreshold: 750 });
  expect(onSaved).toHaveBeenLastCalledWith(750);
  await setInput(input, "");
  await act(async () => el.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  expect(onSaved).toHaveBeenLastCalledWith(null);
});
it("keeps failed saves visible without claiming success", async () => {
  const onSaved = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Not authorized" }) })));
  const el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el);
  await act(async () => root.render(createElement(WholesaleFreeShipping, {
    vendor: { id: "two", name: "Two" }, secret: "fixture", onSaved,
  })));
  await setInput(el.querySelector("input")!, "500");
  await act(async () => el.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  expect(el.textContent).toContain("Not authorized");
  expect(onSaved).not.toHaveBeenCalled();
  expect(el.querySelector("input")!.value).toBe("500");
});
