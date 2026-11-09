import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error supplied by the workspace
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor" });
function globals() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
globals(); beforeEach(globals);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
// @ts-expect-error supplied by the workspace test harness
const { fireEvent } = await import("../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js");
const { VendorAccountSettings } = await import("./VendorAccountSettings");
const { setVendorCsrfToken } = await import("../lib/vendor-auth-client");
let root: ReturnType<typeof createRoot>;
let el: HTMLDivElement;
const state = { email: null, enabled: false, verified: false, pendingEmail: null, expiresAt: null };
async function mount(handler?: (url: string, options?: RequestInit) => Promise<Response>) {
  setVendorCsrfToken("test-vendor-token");
  const mock = vi.fn(handler ?? (async () => new Response(JSON.stringify(state))));
  vi.stubGlobal("fetch", mock);
  el = document.createElement("div"); document.body.append(el); root = createRoot(el);
  const changed = vi.fn();
  await act(async () => root.render(createElement(VendorAccountSettings, { onPasswordChanged: changed, onUsernameChanged: changed })));
  return { mock, changed };
}
const input = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLInputElement;
async function change(id: string, value: string) { await act(async () => fireEvent.change(input(id), { target: { value } })); }
async function submit(id: string) { await act(async () => fireEvent.submit(el.querySelector(`[data-testid="${id}"]`)!)); }
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });

it("renders password and email controls and prevents mismatched password requests", async () => {
  const { mock } = await mount();
  expect(el.textContent).toContain("New orders and messages only");
  await change("input-vendor-current-password", "current-password-123");
  await change("input-vendor-new-password", "new-password-123");
  await change("input-vendor-confirm-password", "different-password");
  await submit("form-vendor-password");
  expect(el.textContent).toContain("New passwords do not match");
  expect(mock).toHaveBeenCalledTimes(1);
});
it("changes the password using current credentials, confirms it and exits the old session", async () => {
  const { mock, changed } = await mount();
  await change("input-vendor-current-password", "current-password-123");
  await change("input-vendor-new-password", "new-password-123");
  await change("input-vendor-confirm-password", "new-password-123");
  await submit("form-vendor-password");
  expect(mock.mock.calls[1][0]).toBe("/api/vendor/auth/change-password");
  expect(JSON.parse(mock.mock.calls[1][1]!.body as string)).toEqual({ currentPassword: "current-password-123", newPassword: "new-password-123", confirmPassword: "new-password-123" });
  expect(new Headers(mock.mock.calls[1][1]!.headers).get("x-vendor-csrf")).toBe("test-vendor-token");
  expect(changed).toHaveBeenCalledTimes(1);
  expect(input("input-vendor-new-password").value).toBe("");
});
it("changes the username with the current password and exits the old session", async () => {
  const { mock, changed } = await mount();
  await change("input-vendor-new-username", "new.vendor");
  await change("input-vendor-username-password", "current-password-123");
  await submit("form-vendor-username");
  expect(mock.mock.calls[1][0]).toBe("/api/vendor/auth/change-username");
  expect(JSON.parse(mock.mock.calls[1][1]!.body as string)).toEqual({ newUsername: "new.vendor", currentPassword: "current-password-123" });
  expect(new Headers(mock.mock.calls[1][1]!.headers).get("x-vendor-csrf")).toBe("test-vendor-token");
  expect(changed).toHaveBeenCalledTimes(1);
  expect(input("input-vendor-username-password").value).toBe("");
});
it("shows username conflicts without signing out", async () => {
  const { changed } = await mount(async url => new Response(JSON.stringify(url.endsWith("/change-username") ? { error: "That vendor username is unavailable." } : state), { status: url.endsWith("/change-username") ? 409 : 200 }));
  await change("input-vendor-new-username", "taken");
  await change("input-vendor-username-password", "current-password-123");
  await submit("form-vendor-username");
  expect(el.textContent).toContain("That vendor username is unavailable.");
  expect(changed).not.toHaveBeenCalled();
});
it("verifies an email before enabling alerts, persists the destination and allows opt out", async () => {
  let saved: any = state;
  const { mock } = await mount(async (url, opts) => {
    if (url.endsWith("/start")) saved = { ...state, pendingEmail: "vendor@example.com" };
    if (url.endsWith("/verify")) saved = { ...state, email: "vendor@example.com", enabled: true, verified: true };
    if (url.endsWith("/toggle")) saved = { ...saved, enabled: JSON.parse(opts!.body as string).enabled };
    return new Response(JSON.stringify(saved));
  });
  await change("input-vendor-email", "vendor@example.com");
  await submit("form-vendor-email");
  expect(el.textContent).toContain("vendor@example.com");
  await change("input-vendor-email-code", "ABC12345");
  await submit("form-vendor-email-code");
  expect(el.textContent).toContain("Verified");
  expect(input("checkbox-vendor-email-enabled").checked).toBe(true);
  await act(async () => fireEvent.click(input("checkbox-vendor-email-enabled")));
  expect(input("checkbox-vendor-email-enabled").checked).toBe(false);
  expect(mock.mock.calls.some(([url]) => url.endsWith("/toggle"))).toBe(true);
});
it("shows load and send failures without claiming that settings saved", async () => {
  await mount(async () => new Response(JSON.stringify({ error: "Email unavailable" }), { status: 503 }));
  expect(el.textContent).toContain("Email unavailable");
  expect(el.textContent).not.toContain("Verified");
});
it("saves new-order and message preferences independently, even before verification", async () => {
  let saved: any = { ...state, newOrders: true, messages: true };
  const { mock } = await mount(async (url, opts) => {
    if (url.endsWith("/preferences")) saved = { ...saved, ...JSON.parse(opts!.body as string) };
    return new Response(JSON.stringify(saved));
  });
  expect(input("checkbox-vendor-email-new-orders").checked).toBe(true);
  await act(async () => fireEvent.click(input("checkbox-vendor-email-messages")));
  expect(input("checkbox-vendor-email-messages").checked).toBe(false);
  expect(input("checkbox-vendor-email-new-orders").checked).toBe(true);
  expect(JSON.parse(mock.mock.calls[1][1]!.body as string)).toEqual({ messages: false });
  await act(async () => fireEvent.click(input("checkbox-vendor-email-new-orders")));
  expect(input("checkbox-vendor-email-new-orders").checked).toBe(false);
  expect(input("checkbox-vendor-email-enabled").disabled).toBe(true);
});
