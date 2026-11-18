import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const workspace = vi.hoisted(() => ({ initialize: vi.fn(), restoreSession: vi.fn(), loginWithSecret: vi.fn(), login: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/peps-admin", () => ({ pepsAdminAuth: workspace }));

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "navigator", "location", "history", "HTMLElement", "HTMLInputElement", "FormData", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: VendorAccountAuth } = await import("./VendorAccountAuth");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
let root: ReturnType<typeof createRoot>;
async function render(responses: Record<string, () => Response>) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${String(input)}`);
    return (responses[String(input)] ?? (() => json({ error: "Authentication required" }, 401)))();
  }));
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  root = createRoot(host);
  const onWorkspace = vi.fn(), onVendor = vi.fn();
  await act(async () => root.render(createElement(VendorAccountAuth, { onAuthenticated: onVendor, onWorkspaceAuthenticated: onWorkspace })));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  return { host, calls, onWorkspace, onVendor };
}
afterEach(async () => { await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; });

it("sends a returning admin with a live session straight to the admin panel", async () => {
  const { host, calls, onWorkspace } = await render({
    "/api/admin/security/status": () => json({ twoFactorEnabled: true }),
    "/api/admin/auth/me": () => json({ username: "ops", csrfToken: "csrf", rememberMe: true }),
  });
  expect(onWorkspace).toHaveBeenCalledTimes(1);
  expect(host.querySelector("form")).toBeNull();
  expect(calls.filter(call => !call.startsWith("GET "))).toEqual([]);
  expect(workspace.initialize).not.toHaveBeenCalled();
});

it("uses the shared-secret session check when two-factor is off", async () => {
  const { onWorkspace, calls } = await render({
    "/api/admin/security/status": () => json({ twoFactorEnabled: false }),
    "/api/admin/auth/legacy-me": () => json({ username: "admin", csrfToken: "csrf" }),
  });
  expect(onWorkspace).toHaveBeenCalledTimes(1);
  expect(calls).toContain("GET /api/admin/auth/legacy-me");
});

it("shows the sign-in form when there is no admin session, or the answer is not a real identity", async () => {
  const signedOut = await render({ "/api/admin/security/status": () => json({ twoFactorEnabled: true }) });
  expect(signedOut.onWorkspace).not.toHaveBeenCalled();
  expect(signedOut.host.querySelector("form")).not.toBeNull();
  await act(async () => root.unmount());
  const odd = await render({ "/api/admin/security/status": () => json({ twoFactorEnabled: true }), "/api/admin/auth/me": () => json({ ok: true }) });
  expect(odd.onWorkspace).not.toHaveBeenCalled();
  expect(odd.host.querySelector("form")).not.toBeNull();
});
