import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const workspace = vi.hoisted(() => ({
  initialize: vi.fn(), loginWithSecret: vi.fn(), login: vi.fn(), verify: vi.fn(),
}));
vi.mock("../lib/peps-admin", () => ({ pepsAdminAuth: workspace }));

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor/login" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "location", "history", "HTMLElement", "HTMLInputElement", "FormData", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("addEventListener", dom.window.addEventListener.bind(dom.window));
  vi.stubGlobal("removeEventListener", dom.window.removeEventListener.bind(dom.window));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(() => {
  setupDom();
  vi.clearAllMocks();
  workspace.initialize.mockResolvedValue({ twoFactorEnabled: false });
  workspace.loginWithSecret.mockRejectedValue(new Error("Unauthorized"));
});
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { Router } = await import("wouter");
const { memoryLocation } = await import("wouter/memory-location");
const { default: VendorLogin } = await import("./VendorLogin");
let root: ReturnType<typeof createRoot>;
let element: HTMLElement;
let path: ReturnType<typeof memoryLocation>;
async function render() {
  element = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(element);
  root = createRoot(element);
  path = memoryLocation({ path: "/vendor/login", static: false, record: true });
  await act(async () => root.render(createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    createElement(Router, { hook: path.hook }, createElement(VendorLogin)))));
  await settle();
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
function fields() { return [...element.querySelectorAll("input")]; }
async function enterAndSubmit() {
  const inputs = fields();
  await act(async () => {
    const username = inputs.find(i => i.name === "username")!;
    const password = inputs.find(i => i.name === "password")!;
    const nativeValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    nativeValue.call(username, "vendor-test");
    username.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    nativeValue.call(password, "example-password");
    password.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await act(async () => element.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
}

it("uses dedicated vendor sign-in and offers independent account creation", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
  await render();
  expect(element.textContent).toContain("Sign in to the vendor portal");
  expect(element.querySelector('a[href="/login"]')).toBeNull();
  expect(element.textContent).toContain("Create vendor account");
  expect(fields().some(i => i.name === "username")).toBe(true);
  expect(element.textContent).not.toMatch(/\badmin\b/i);
  expect(element.querySelector('a[href="/vendor/admin"]')).toBeNull();
});
it("accepts the existing secret-mode login without exposing a separate login option", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  workspace.loginWithSecret.mockResolvedValue(undefined);
  await render();
  await enterAndSubmit();
  expect(workspace.loginWithSecret).toHaveBeenCalledWith("example-password", false);
  expect(path.history.at(-1)).toBe("/vendor/admin");
  expect(element.textContent).not.toMatch(/\badmin\b/i);
});
it("keeps the existing second factor mandatory on the shared sign-in form", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  workspace.initialize.mockResolvedValue({ twoFactorEnabled: true });
  workspace.login.mockResolvedValue("opaque-challenge");
  workspace.verify.mockResolvedValue({ username: "staff" });
  await render();
  await enterAndSubmit();
  expect(workspace.login).toHaveBeenCalledWith("vendor-test", "example-password", false);
  expect(path.history.at(-1)).toBe("/vendor/login");
  expect(element.textContent).toContain("One more step");
  expect(element.textContent).not.toMatch(/\badmin\b/i);
  const code = element.querySelector<HTMLInputElement>('[name="code"]')!;
  const { fireEvent } = await import("../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js");
  await act(async () => fireEvent.change(code, { target: { value: "123456" } }));
  await act(async () => element.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  expect(workspace.verify).toHaveBeenCalledWith("opaque-challenge", { code: "123456" });
  expect(path.history.at(-1)).toBe("/vendor/admin");
});
it("never attempts the alternate sign-in after a service error or a successful vendor login", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, opts?: RequestInit) =>
    new Response(JSON.stringify({ error: "Try again later" }), { status: opts?.method === "POST" ? 503 : 401 })));
  await render();
  await enterAndSubmit();
  expect(workspace.initialize).not.toHaveBeenCalled();
  expect(path.history.at(-1)).toBe("/vendor/login");
});
it("does not reveal the privileged login when credentials are rejected", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  workspace.loginWithSecret.mockRejectedValue(new Error("Admin credential rejected"));
  await render();
  await enterAndSubmit();
  expect(element.textContent).toContain("Could not sign in. Check your details and try again.");
  expect(element.textContent).not.toMatch(/\badmin\b/i);
  expect(path.history.at(-1)).toBe("/vendor/login");
});
it("preserves the second-factor challenge on rejected codes and allows recovery codes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  workspace.initialize.mockResolvedValue({ twoFactorEnabled: true });
  workspace.login.mockResolvedValue("opaque-challenge");
  workspace.verify.mockRejectedValueOnce(new Error("Invalid code")).mockResolvedValue({ username: "staff" });
  await render();
  await enterAndSubmit();
  const { fireEvent } = await import("../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js");
  await act(async () => fireEvent.change(element.querySelector('[name="code"]')!, { target: { value: "000000" } }));
  await act(async () => element.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  expect(path.history.at(-1)).toBe("/vendor/login");
  expect(element.textContent).toContain("Verification was not accepted");
  await act(async () => fireEvent.click(element.querySelector('input[type="checkbox"]')!));
  await act(async () => fireEvent.change(element.querySelector('[name="code"]')!, { target: { value: "RECOVERY-TEST" } }));
  await act(async () => element.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  expect(workspace.verify).toHaveBeenLastCalledWith("opaque-challenge", { recoveryCode: "RECOVERY-TEST" });
  expect(path.history.at(-1)).toBe("/vendor/admin");
});
it("signs in using only vendor authentication and opens the portal for a linked active account", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, opts?: RequestInit) => {
    calls.push(`${opts?.method ?? "GET"} ${url}`);
    if (url === "/api/vendor/auth/login") return new Response(JSON.stringify({ csrfToken: "vendor-token", account: { username: "vendor-test", companyName: "Supplier", status: "active", vendorId: "a" } }));
    if (url === "/api/vendor/auth/session") return new Response('{}', { status: 401 });
    throw new Error("Unexpected URL");
  }));
  await render();
  await enterAndSubmit();
  // Signed out on load, the form makes one read-only check for a live admin session before the vendor login.
  expect(calls).toEqual(["GET /api/vendor/auth/session", "GET /api/admin/security/status", "POST /api/vendor/auth/login"]);
  expect(workspace.initialize).not.toHaveBeenCalled();
  expect(path.history?.at(-1)).toBe("/vendor");
});
it("restores pending accounts and preserves them when vendor logout fails", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/vendor/auth/session") return new Response(JSON.stringify({ csrfToken: "vendor-token", account: { username: "supplier", status: "pending", vendorId: null, companyName: "Supplier" } }));
    if (url === "/api/vendor/auth/logout") return new Response('{}', { status: 503 });
    throw new Error("Unexpected URL");
  }));
  await render();
  expect(element.textContent).toContain("awaiting approval");
  const button = [...element.querySelectorAll("button")].find(b => b.textContent === "Sign out")!;
  await act(async () => button.click());
  await settle();
  expect(element.textContent).toContain("Could not sign out");
  expect(element.textContent).toContain("Signed in as supplier");
});
it("creates a pending vendor account without a member signup, email or verification", async () => {
  const calls: string[] = [];
  let payload: Record<string, unknown> = {};
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    calls.push(String(url));
    if (url === "/api/vendor/auth/session") return new Response('{}', { status: 401 });
    if (url === "/api/vendor/auth/signup") {
      payload = JSON.parse(String(options?.body));
      return new Response(JSON.stringify({ csrfToken: "vendor-token", account: { username: payload.username, status: "pending", vendorId: null, companyName: payload.companyName } }), { status: 201 });
    }
    throw new Error("Unexpected URL");
  }));
  await render();
  await act(async () => [...element.querySelectorAll("button")].find(b => b.textContent === "Create vendor account")!.click());
  await act(async () => {
    const nativeValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    for (const [name, value] of Object.entries({ companyName: "Supplier", username: "supplier", password: "long-vendor-password", confirm: "long-vendor-password" })) {
      nativeValue.call(element.querySelector(`input[name="${name}"]`), value);
    }
    element.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await settle();
  expect(payload).toEqual({ username: "supplier", password: "long-vendor-password", companyName: "Supplier" });
  expect(calls).toEqual(["/api/vendor/auth/session", "/api/admin/security/status", "/api/vendor/auth/signup"]);
  expect(element.textContent).toContain("awaiting approval");
});
it('returns to sign in when logout confirms the vendor session was revoked', async () => {
  let revoked = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/vendor/auth/session') return revoked ? new Response('{}', { status: 401 }) : new Response(JSON.stringify({ csrfToken: 'vendor-token', account: { username: 'supplier', status: 'pending', companyName: 'Supplier', vendorId: null } }));
    if (url === '/api/vendor/auth/logout') { revoked = true; return new Response('{}', { status: 401 }); }
    throw new Error('Unexpected URL');
  }));
  await render();
  await act(async () => [...element.querySelectorAll('button')].find(b => b.textContent === 'Sign out')!.click());
  await settle();
  expect(element.textContent).toContain('Sign in to the vendor portal');
  expect(element.textContent).not.toContain('Could not sign out');
});
