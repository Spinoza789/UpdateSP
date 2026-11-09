import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error provided by workspace
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor" });
function globals() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
globals(); beforeEach(() => { globals(); dom.window.localStorage.clear(); });
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { VendorSetupGuide } = await import("./VendorSetupGuide");
let root: ReturnType<typeof createRoot>, el: HTMLDivElement;
const email = { verified: true, enabled: true, newOrders: true, messages: false };
const telegram = { configured: true, chats: [{ prefs: { newOrders: true } }] };
async function mount(options: { username?: string; walletReady?: boolean; error?: boolean } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => options.error ? Response.json({ error: "Unavailable" }, { status: 503 }) : Response.json(url.endsWith("/telegram") ? telegram : email)));
  el = document.createElement("div"); document.body.append(el); root = createRoot(el);
  const open = vi.fn();
  await act(async () => root.render(createElement(VendorSetupGuide, { username: options.username ?? "jbg123", walletReady: options.walletReady ?? true, walletLoading: false, walletError: null, onOpenStep: open })));
  return { open };
}
const find = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement;
async function click(id: string) { await act(async () => find(id).click()); }
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });

it("shows JBG123 a five-step guide with real wallet and notification completion", async () => {
  await mount();
  expect(el.textContent).toContain("jbg123");
  expect(find("status-setup-wallet").textContent).toBe("Complete");
  expect(find("status-setup-email").textContent).toBe("Complete");
  expect(find("status-setup-telegram").textContent).toBe("Complete");
  expect(find("status-setup-username").textContent).toBe("To review");
  expect(find("status-setup-password").textContent).toBe("To review");
});
it("opens each existing settings form without changing settings or blocking orders", async () => {
  const { open } = await mount();
  for (const step of ["username", "password", "wallet", "email", "telegram"]) await click(`button-setup-open-${step}`);
  expect(open.mock.calls.map(call => call[0])).toEqual(["username", "password", "wallet", "email", "telegram"]);
  expect(vi.mocked(fetch).mock.calls.every(call => !call[1]?.method)).toBe(true);
});
it("saves explicit credential reviews for this account on this browser", async () => {
  await mount();
  await click("button-setup-review-username");
  await click("button-setup-review-password");
  expect(find("status-setup-password").textContent).toBe("Reviewed");
  await act(async () => root.unmount());
  await mount();
  expect(find("status-setup-username").textContent).toBe("Reviewed");
  expect(find("status-setup-password").textContent).toBe("Reviewed");
});
it("does not share review progress when switching vendor accounts", async () => {
  await mount(); await click("button-setup-review-username");
  await act(async () => root.render(createElement(VendorSetupGuide, { username: "another-vendor", walletReady: true, walletLoading: false, walletError: null, onOpenStep: vi.fn() })));
  expect(find("status-setup-username").textContent).toBe("To review");
});
it("shows unavailable checks honestly and lets the vendor retry", async () => {
  await mount({ walletReady: false, error: true });
  expect(find("status-setup-wallet").textContent).toBe("To set up");
  expect(find("status-setup-email").textContent).toBe("Could not check");
  expect(find("status-setup-telegram").textContent).toBe("To set up");
  vi.mocked(fetch).mockImplementation(async (url: any) => Response.json(String(url).endsWith("/telegram") ? telegram : email));
  await click("button-setup-refresh");
  expect(find("status-setup-email").textContent).toBe("Complete");
});
it("reports Telegram check failures when a wallet is already configured", async () => {
  await mount({ error: true });
  expect(find("status-setup-telegram").textContent).toBe("Could not check");
});
it("allows optional alerts to be skipped without enabling them", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ verified: false, enabled: false, configured: true, chats: [] })));
  el = document.createElement("div"); document.body.append(el); root = createRoot(el);
  await act(async () => root.render(createElement(VendorSetupGuide, { username: "jbg123", walletReady: true, walletLoading: false, walletError: null, onOpenStep: vi.fn() })));
  await click("button-setup-skip-email"); await click("button-setup-skip-telegram");
  expect(find("status-setup-email").textContent).toBe("Skipped");
  expect(find("status-setup-telegram").textContent).toBe("Skipped");
  expect(vi.mocked(fetch).mock.calls.every(call => !call[1]?.method)).toBe(true);
});
