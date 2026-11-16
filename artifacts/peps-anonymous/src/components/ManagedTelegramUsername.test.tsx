import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "MutationObserver"])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ account: { telegramUsername: "manager" } }) }));
const React = await import("react");
(globalThis as any).React = React;
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { ManagedTelegramUsername } = await import("./ManagedTelegramUsername");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, client: InstanceType<typeof QueryClient>;
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ linked: true, username: "RealTelegram" })));
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); vi.unstubAllGlobals(); });
async function mount(scope = "organiser", response?: object) {
  if (response) vi.mocked(fetch).mockResolvedValue(Response.json(response));
  await act(async () => root.render(h(QueryClientProvider, { client }, h(ManagedTelegramUsername, { scope: scope as any, id: "group", username: "@website" }))));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
}
it("automatically shows the actual Telegram link in each scoped workspace", async () => {
  for (const [scope, prefix] of [["organiser", "organiser/group-buys"], ["reshipper", "reshipper/gb"], ["shared", "wholesale-shares"]]) {
    await mount(scope);
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toBe(`/api/${prefix}/group/members/website/telegram-profile`);
    expect(host.textContent).toContain("Linked Telegram:");
    expect(host.querySelector("a")?.href).toBe("https://t.me/RealTelegram");
    expect(host.textContent).not.toContain("@website");
  }
});
it("labels unlinked accounts and absent public usernames without guessing", async () => {
  await mount("organiser", { linked: false, username: null });
  expect(host.textContent).toContain("Not linked");
  await mount("shared", { linked: true, username: null });
  expect(host.textContent).toContain("No public username set");
  expect(host.querySelector("a")).toBeNull();
});
it("offers retry on failure without exposing a guessed contact", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Not permitted" }, { status: 404 }));
  await mount();
  expect(host.textContent).toContain("Lookup unavailable");
  expect(host.querySelector("a")).toBeNull();
  vi.mocked(fetch).mockResolvedValue(Response.json({ linked: true, username: "Refreshed" }));
  await act(async () => host.querySelector("button")!.click());
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(host.querySelector("a")?.href).toBe("https://t.me/Refreshed");
});
it("limits simultaneous contact requests in long member lists", async () => {
  let active = 0, peak = 0;
  const release: (() => void)[] = [];
  vi.mocked(fetch).mockImplementation(async () => {
    active++; peak = Math.max(peak, active);
    await new Promise<void>(resolve => release.push(resolve));
    active--;
    return Response.json({ linked: true, username: "RealTelegram" });
  });
  await act(async () => root.render(h(QueryClientProvider, { client },
    h("div", null, ...Array.from({ length: 6 }, (_, i) => h(ManagedTelegramUsername, { key: i, scope: "organiser", id: "g", username: `member${i}` }))),
  )));
  expect(peak).toBe(4);
  await act(async () => {
    release.splice(0).forEach(resolve => resolve());
    await new Promise(resolve => setTimeout(resolve, 20));
    release.splice(0).forEach(resolve => resolve());
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  expect(fetch).toHaveBeenCalledTimes(6);
  expect(peak).toBe(4);
});
