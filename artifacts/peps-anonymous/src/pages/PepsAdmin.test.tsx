import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor/admin" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node", "MouseEvent", "KeyboardEvent"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);
const { default: PepsAdmin } = await import("./PepsAdmin");
const { pepsAdminAuth } = await import("@/lib/peps-admin");
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
const order = (id = "order-1", vendorId = "v1", status = "submitted") => ({
  id, vendorId, vendorName: vendorId === "v1" ? "Alder Supply" : "Birch Goods", reference: `PO-${id}`,
  status, submittedAt: "2026-04-10T10:00:00Z", stale: false, items: [{ productName: "Glass charm", quantity: 2, unitCost: "4.25", lineTotal: "8.50" }],
  currency: "USD", productCost: "8.50", shippingCost: "3.00", totalCost: "11.50",
  shipping: { name: "Mina Lee", address: "12 Field Lane", country: "United Kingdom", phone: "", email: "mina@example.test" },
  trackingNumber: status === "shipped" ? "TRACK-22" : null, carrier: status === "shipped" ? "Parcel Post" : null, images: [],
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const list = (vendorId = "") => {
  const orders = [order("order-1", "v1"), order("order-2", "v2", "processing")].filter(o => !vendorId || o.vendorId === vendorId);
  return { vendors: [{ id: "v1", name: "Alder Supply" }, { id: "v2", name: "Birch Goods" }], orders, total: orders.length, page: 1, limit: 50 };
};
const fulfillSetup = (options: { twoFactor?: boolean; noSession?: boolean } = {}) => {
  const twoFactorEnabled = options.twoFactor ?? true;
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url === "/api/admin/security/status") return json({ twoFactorEnabled });
    if (url === `/api/admin/auth/${twoFactorEnabled ? "me" : "legacy-me"}`) {
      return options.noSession ? json({ error: "admin_session_expired" }, 401) : json({ username: "ops", csrfToken: "csrf-1" });
    }
    if (url.startsWith("/api/admin/vendor-portal/orders?")) {
      return json(list(new URL(url, "http://localhost").searchParams.get("vendorId") ?? ""));
    }
    if (url.startsWith("/api/admin/vendor-portal/orders/") && (!init?.method || init.method === "GET")) {
      const id = decodeURIComponent(url.split("/").at(-1)!);
      return json(order(id, id === "order-2" ? "v2" : "v1"));
    }
    if (url === "/api/admin/auth/login") return json({ challenge: "challenge-1" });
    if (url === "/api/admin/auth/verify") return json({ username: "ops", csrfToken: "csrf-2" });
    if (url === "/api/admin/auth/legacy-login") return json({ username: "ops", csrfToken: "csrf-legacy" });
    if (url === "/api/admin/auth/logout" || url === "/api/admin/auth/legacy-logout") return json({ ok: true });
    if (url.endsWith("/orders/order-1") && init?.method === "PATCH") return json({ ok: true });
    if (url.endsWith("/orders/order-1") && init?.method === "DELETE") return json({ ok: true });
    if (url === "/api/admin/vendor-portal/preview") return json({ shipments: [order("preview-1", "v1")], previewToken: "preview-token" });
    if (url === "/api/admin/vendor-portal/submit") return json({ ok: true });
    return json({ error: `unexpected ${init?.method ?? "GET"} ${url}` }, 404);
  });
};
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
async function render() {
  host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(PepsAdmin)));
  await settle();
}
function byTestId(id: string) {
  const found = host.querySelector(`[data-testid="${id}"]`);
  if (!found) throw new Error(`Missing test id ${id}`);
  return found as HTMLElement;
}
function click(id: string) { return act(async () => { byTestId(id).click(); await new Promise(resolve => setTimeout(resolve, 20)); }); }
function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  return act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new dom.window.Event(el instanceof dom.window.HTMLSelectElement ? "change" : "input", { bubbles: true }));
    if (el instanceof dom.window.HTMLInputElement && el.type === "checkbox") el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 20));
  });
}
beforeEach(() => {
  setupDom();
  pepsAdminAuth.clear();
  pepsAdminAuth.twoFactorEnabled = null;
  pepsAdminAuth.onSessionExpired = undefined;
  fetchMock.mockReset();
  dom.window.document.body.innerHTML = "";
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  pepsAdminAuth.clear();
  pepsAdminAuth.onSessionExpired = undefined;
  dom.window.document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", fetchMock);
});

it("restores a cookie session and retries a transient restore-session 503", async () => {
  let restoreAttempts = 0;
  fetchMock.mockImplementation(async input => {
    if (input === "/api/admin/security/status") return json({ twoFactorEnabled: true });
    if (input === "/api/admin/auth/me") {
      restoreAttempts++;
      return restoreAttempts === 1 ? json({ error: "temporarily unavailable" }, 503) : json({ username: "ops", csrfToken: "csrf" });
    }
    if (String(input).includes("/vendor-portal/orders?")) return json(list());
    return json({ error: "unexpected" }, 404);
  });
  await render();
  expect(restoreAttempts).toBe(2);
  expect(fetchMock.mock.calls.some(call => call[0] === "/api/admin/auth/me")).toBe(true);
  expect(host.textContent).toContain("Needs attention");
});

it("uses the MFA challenge contract and the legacy shared-secret contract", async () => {
  fulfillSetup({ twoFactor: true, noSession: true });
  await render();
  await setValue(host.querySelector('input[autocomplete="username"]') as HTMLInputElement, "ops");
  await setValue(host.querySelector('input[type="password"]') as HTMLInputElement, "not-stored");
  await act(async () => (host.querySelector("form") as HTMLFormElement).dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  expect(host.textContent).toContain("Verify it’s you");
  expect(fetchMock.mock.calls.some(c => c[0] === "/api/admin/auth/login" && JSON.parse(c[1]?.body as string).username === "ops")).toBe(true);
  await setValue(host.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement, "123456");
  await act(async () => (host.querySelector("form") as HTMLFormElement).dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  const verify = fetchMock.mock.calls.find(c => c[0] === "/api/admin/auth/verify");
  expect(JSON.parse(verify?.[1]?.body as string)).toEqual({ challenge: "challenge-1", code: "123456" });
  expect(host.textContent).toContain("Needs attention");

  await act(async () => root.unmount());
  pepsAdminAuth.clear(); pepsAdminAuth.twoFactorEnabled = null;
  fulfillSetup({ twoFactor: false, noSession: true });
  await render();
  await setValue(host.querySelector('input[type="password"]') as HTMLInputElement, "legacy-secret");
  await act(async () => (host.querySelector("form") as HTMLFormElement).dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  const legacy = fetchMock.mock.calls.find(c => c[0] === "/api/admin/auth/legacy-login");
  expect(JSON.parse(legacy?.[1]?.body as string)).toEqual({ adminSecret: "legacy-secret", rememberMe: false });
  expect(host.textContent).toContain("Needs attention");
});

it("sends vendorId after selection and clears selected detail", async () => {
  fulfillSetup(); await render();
  await click("button-refresh");
  await setValue(byTestId("select-vendor") as HTMLSelectElement, "v2");
  await settle();
  expect(fetchMock.mock.calls.some(c => String(c[0]).includes("vendorId=v2"))).toBe(true);
  expect(host.textContent).toContain("PO-order-2");
  expect(host.textContent).not.toContain("PO-order-1");
});

it("loads detail and sends permitted processing and tracking mutations", async () => {
  fulfillSetup(); await render(); await click("nav-orders");
  await act(async () => byTestId("row-order-order-1").click());
  await settle();
  expect(host.textContent).toContain("Glass charm");
  expect(host.textContent).toContain("Mina Lee");
  await click("button-process");
  expect(fetchMock.mock.calls.some(c => c[0] === "/api/admin/vendor-portal/orders/order-1" && c[1]?.method === "PATCH" && JSON.parse(c[1].body as string).action === "processing")).toBe(true);
  await setValue(byTestId("input-tracking") as HTMLInputElement, "TRACK-567");
  await setValue(byTestId("input-carrier") as HTMLInputElement, "Parcel Post");
  await click("button-add-tracking");
  await setValue(byTestId("input-tracking-1") as HTMLInputElement, "RM987654GB");
  await setValue(byTestId("select-carrier-1") as HTMLSelectElement, "Royal Mail");
  await click("button-save-tracking");
  const track = fetchMock.mock.calls.find(c => c[0] === "/api/admin/vendor-portal/orders/order-1" && c[1]?.method === "PATCH" && JSON.parse(c[1].body as string).action === "tracking");
  expect(JSON.parse(track?.[1]?.body as string)).toEqual({ action: "tracking", trackingPackages: [
    { id: "legacy-0", courier: "Parcel Post", internationalTrackingNumber: "TRACK-567", localTrackingNumber: null },
    expect.objectContaining({ courier: "Royal Mail", internationalTrackingNumber: "RM987654GB", localTrackingNumber: null }),
  ], expectedTrackingPackages: [] });
// Each parcel row renders the full carrier list, which is slow under jsdom.
}, 15_000);

it("keeps the recall confirmation open on a failed recall", async () => {
  fulfillSetup();
  fetchMock.mockImplementation(async (input, init) => {
    if (String(input).endsWith("/security/status")) return json({ twoFactorEnabled: true });
    if (input === "/api/admin/auth/me") return json({ username: "ops", csrfToken: "csrf" });
    if (String(input).includes("/vendor-portal/orders?")) return json(list());
    if (String(input).endsWith("/orders/order-1") && (!init?.method || init.method === "GET")) return json({ ...order(), trackingNumber: "TRACK-22" });
    if (String(input).endsWith("/orders/order-1") && init?.method === "DELETE") return json({ error: "Payment allocation blocks recall" }, 409);
    return json({ ok: true });
  });
  await render(); await click("nav-orders"); await act(async () => byTestId("row-order-order-1").click()); await settle(); await click("button-recall");
  await setValue(host.querySelector(".pa-textarea") as HTMLTextAreaElement, "duplicate vendor shipment");
  const checkbox = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
  await act(async () => { checkbox.click(); });
  await click("button-recall-confirm");
  expect(host.textContent).toContain("Recall order");
  expect(host.textContent).toContain("Payment allocation blocks recall");
});

it("previews before submission and invalidates preview when order codes are edited", async () => {
  fulfillSetup(); await render();
  await click("button-resubmit");
  await setValue(host.querySelector(".pa-modal select") as HTMLSelectElement, "v1");
  await setValue(host.querySelector(".pa-modal textarea") as HTMLTextAreaElement, "S-100 S-101");
  await click("button-review-submission");
  expect(host.textContent).toContain("Review before submitting");
  expect(host.textContent).toContain("Glass charm");
  expect(host.textContent).toContain("$4.25");
  expect(host.textContent).toContain("$8.50");
  expect(host.textContent).toContain("12 Field Lane");
  expect(host.textContent).toContain("Product total");
  expect(fetchMock.mock.calls.some(c => c[0] === "/api/admin/vendor-portal/preview" && JSON.parse(c[1]?.body as string).orderCodes.join(",") === "S-100,S-101")).toBe(true);
  await click("button-edit-submission");
  await setValue(host.querySelector(".pa-modal textarea") as HTMLTextAreaElement, "S-102");
  expect(host.textContent).not.toContain("Review before submitting");
  await click("button-review-submission");
  await settle();
  await click("button-confirm-submission");
  expect(fetchMock.mock.calls.some(c => c[0] === "/api/admin/vendor-portal/submit" && JSON.parse(c[1]?.body as string).previewToken === "preview-token")).toBe(true);
});

it("locks resubmission inputs while the server preview is pending", async () => {
  let finishPreview: ((response: Response) => void) | undefined;
  fetchMock.mockImplementation(async (input, init) => {
    if (input === "/api/admin/security/status") return json({ twoFactorEnabled: true });
    if (input === "/api/admin/auth/me") return json({ username: "ops", csrfToken: "csrf" });
    if (String(input).includes("/vendor-portal/orders?")) return json(list());
    if (input === "/api/admin/vendor-portal/preview") return new Promise<Response>(resolve => { finishPreview = resolve; });
    return json({ ok: true });
  });
  await render(); await click("button-resubmit");
  await setValue(host.querySelector(".pa-modal select") as HTMLSelectElement, "v1");
  await setValue(host.querySelector(".pa-modal textarea") as HTMLTextAreaElement, "S-200");
  await click("button-review-submission");
  expect((host.querySelector(".pa-modal textarea") as HTMLTextAreaElement).disabled).toBe(true);
  expect((byTestId("button-review-submission") as HTMLButtonElement).disabled).toBe(true);
  await act(async () => { finishPreview?.(json({ shipments: [order("preview-2", "v1")], previewToken: "t2" })); await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(host.textContent).toContain("Review before submitting");
});

it("keeps the authenticated workspace visible when sign-out fails", async () => {
  fulfillSetup();
  fetchMock.mockImplementation(async (input, init) => {
    if (input === "/api/admin/security/status") return json({ twoFactorEnabled: true });
    if (input === "/api/admin/auth/me") return json({ username: "ops", csrfToken: "csrf" });
    if (String(input).includes("/vendor-portal/orders?")) return json(list());
    if (input === "/api/admin/auth/logout") return json({ error: "server unavailable" }, 503);
    return json({ ok: true });
  });
  await render(); await click("button-signout");
  expect(host.textContent).toContain("Needs attention");
  expect(host.textContent).toContain("Sign out failed");
});

it("ignores a list response that arrives after the admin session expires", async () => {
  let finishList: ((response: Response) => void) | undefined;
  fetchMock.mockImplementation(async (input) => {
    if (input === "/api/admin/security/status") return json({ twoFactorEnabled: true });
    if (input === "/api/admin/auth/me") return json({ username: "ops", csrfToken: "csrf" });
    if (String(input).includes("/vendor-portal/orders?")) return new Promise<Response>(resolve => { finishList = resolve; });
    return json({ error: "unexpected" }, 404);
  });
  await render();
  await act(async () => { pepsAdminAuth.onSessionExpired?.(); });
  await act(async () => { finishList?.(json(list())); await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(host.querySelector('input[autocomplete="username"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="row-order-order-1"]')).toBeNull();
  expect(host.querySelector(".pa-modal")).toBeNull();
});

it("renders completed shipments as terminal and omits processing and tracking controls", async () => {
  fetchMock.mockImplementation(async (input, init) => {
    if (input === "/api/admin/security/status") return json({ twoFactorEnabled: true });
    if (input === "/api/admin/auth/me") return json({ username: "ops", csrfToken: "csrf" });
    if (String(input).includes("/vendor-portal/orders?")) return json({ ...list(), orders: [order("done", "v1", "completed")], total: 1 });
    if (String(input).endsWith("/orders/done") && (!init?.method || init.method === "GET")) return json(order("done", "v1", "completed"));
    return json({ ok: true });
  });
  await render(); await click("nav-orders");
  expect(host.textContent).toContain("Completed");
  await act(async () => host.querySelector('[data-testid="row-order-done"]')?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
  await settle();
  expect(host.textContent).toContain("Completed");
  expect(host.querySelector('[data-testid="button-process"]')).toBeNull();
  expect(host.querySelector('[data-testid="input-tracking"]')).toBeNull();
});

it("opens the supplier payment ledger through the workspace admin session", async () => {
  fulfillSetup();
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (input, init) => String(input).startsWith("/api/admin/vendor-payments")
    ? json({ vendors: [{ id: "v1", name: "Alder Supply", freeShippingThreshold: null }], vendorId: null, wallets: [], orders: [], payments: [], summary: {} })
    : base(input, init));
  await render(); await click("nav-payments");
  expect(byTestId("vendor-payments-admin")).toBeTruthy();
  expect(fetchMock.mock.calls.some(c => c[0] === "/api/admin/vendor-payments")).toBe(true);
  expect(host.textContent).toContain("Alder Supply");
});

it("filters the whole panel from the sidebar vendor switcher and shows per-vendor analytics", async () => {
  fulfillSetup(); await render();
  await click("nav-analytics");
  expect(byTestId("analytics-vendors").textContent).toContain("Alder Supply");
  expect(byTestId("analytics-vendors").textContent).toContain("Birch Goods");
  expect(fetchMock.mock.calls.some(c => String(c[0]).startsWith("/api/admin/vendor-payments/report"))).toBe(true);
  await click("vendor-filter-v2");
  await settle();
  expect(fetchMock.mock.calls.some(c => String(c[0]).includes("/vendor-portal/orders?") && String(c[0]).includes("vendorId=v2"))).toBe(true);
  expect(fetchMock.mock.calls.some(c => String(c[0]).startsWith("/api/admin/vendor-payments/report") && String(c[0]).includes("vendorId=v2"))).toBe(true);
  expect(byTestId("analytics-vendors").textContent).not.toContain("Alder Supply");
  expect((byTestId("select-vendor") as HTMLSelectElement).value).toBe("v2");
});

it("shows what the vendor bot sent, as plain text, and follows the vendor filter", async () => {
  fulfillSetup();
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (input, init) => String(input).startsWith("/api/admin/vendor-telegram/log")
    ? json({ vendors: [], hasMore: false, entries: [
      { id: "t1", vendorId: "v1", vendorName: "Alder Supply", chatTitle: "Packing team", kind: "new_order", text: "📦 <b>New shipment #PO-1</b>\n2 &amp; 3 units", buttonUrl: "https://example.test/vendor?order=1", ok: true, error: null, createdAt: "2026-04-10T10:00:00Z" },
      { id: "t2", vendorId: "v1", vendorName: "Alder Supply", chatTitle: null, kind: "overdue", text: "Late", buttonUrl: null, ok: false, error: "Forbidden: bot was blocked by the user", createdAt: "2026-04-09T10:00:00Z" },
    ] })
    : base(input, init));
  await render(); await click("nav-telegram");
  const log = byTestId("telegram-log");
  expect(log.textContent).toContain("New shipment #PO-1");
  expect(log.textContent).toContain("2 & 3 units");
  expect(log.querySelector("b")).toBeNull();
  expect(log.textContent).toContain("Packing team");
  expect(log.textContent).toContain("bot was blocked by the user");
  await click("vendor-filter-v2");
  await click("telegram-filter-failed");
  expect(fetchMock.mock.calls.some(c => String(c[0]).startsWith("/api/admin/vendor-telegram/log") && String(c[0]).includes("vendorId=v2") && String(c[0]).includes("failed=1"))).toBe(true);
});

it("previews a vendor's portal read-only without calling any vendor API", async () => {
  fulfillSetup();
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (input, init) => String(input).startsWith("/api/admin/vendor-payments")
    ? json({ vendors: [], wallets: [{ id: "w1", currency: "USDT", network: "TRON", address: "T-wallet-1" }], orders: [], payments: [] })
    : base(input, init));
  await render(); await click("view-as-v1");
  expect(byTestId("vendor-preview-banner").textContent).toContain("Viewing as Alder Supply");
  expect(byTestId("text-vendor-name").textContent).toBe("Alder Supply");
  expect(host.textContent).toContain("PO-order-1");
  expect(host.textContent).not.toContain("PO-order-2");
  await click("card-order-order-1");
  expect(host.textContent).toContain("Glass charm");
  expect(host.querySelector('[data-testid="button-mark-processing"]')).toBeNull();
  expect((byTestId("input-tracking") as HTMLInputElement).disabled).toBe(true);
  await click("nav-settings");
  expect(byTestId("preview-wallets").textContent).toContain("T-wallet-1");
  expect(fetchMock.mock.calls.some(c => String(c[0]).startsWith("/api/vendor/"))).toBe(false);
  expect(fetchMock.mock.calls.some(c => (c[1]?.method ?? "GET") !== "GET" && !String(c[0]).startsWith("/api/admin/auth/"))).toBe(false);
  await click("button-exit-preview");
  expect(host.querySelector('[data-testid="peps-admin-workspace"]')).not.toBeNull();
}, 15_000);
