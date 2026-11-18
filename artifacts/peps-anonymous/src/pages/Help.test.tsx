import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/help" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node", "MouseEvent", "KeyboardEvent", "localStorage"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};

let account: { telegramUsername: string; organiserStatus?: string | null; reshipperStatus?: string | null } | null = null;
vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ account, isLoggedIn: !!account }) }));
vi.mock("@/components/ResearchShell", () => ({ ResearchShell: ({ children }: { children: unknown }) => children }));
let wholesale = true;
vi.stubGlobal("fetch", vi.fn(async (input: unknown) => new Response(JSON.stringify(
  String(input) === "/api/config" ? { wholesaleAccessEnabled: wholesale } : { status: null }), { status: 200, headers: { "content-type": "application/json" } })));

const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { Router } = await import("wouter");
const { memoryLocation } = await import("wouter/memory-location");
const { default: Help } = await import("./Help");
const { HelpVideoHost } = await import("@/components/help/HelpVideoHost");
const { closeHelpVideo } = await import("@/components/help/help-video-store");

let root: ReturnType<typeof createRoot>; let host: HTMLDivElement;
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
async function render(path = "/help") {
  host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  root = createRoot(host);
  const { hook } = memoryLocation({ path });
  await act(async () => root.render(createElement(Router, { hook }, createElement(Help), createElement(HelpVideoHost))));
  await settle();
}
const has = (id: string) => !!dom.window.document.querySelector(`[data-testid="${id}"]`);
const click = (id: string) => act(async () => { (dom.window.document.querySelector(`[data-testid="${id}"]`) as HTMLElement).click(); await new Promise(resolve => setTimeout(resolve, 60)); });
beforeEach(() => { account = null; dom.window.localStorage.clear(); });
afterEach(async () => { closeHelpVideo(); await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; });

it("shows only public videos and a login card to a logged-out visitor", async () => {
  await render();
  expect(has("help-card-batch-system")).toBe(true);
  expect(has("help-card-faq-lab-tests")).toBe(true);
  expect(has("help-login-card")).toBe(true);
  for (const hidden of ["shared-orders", "wholesale", "faq-wholesale", "organiser-1-create", "organiser-2-orders", "pool-leader-2-options", "vendor-portal", "dashboard-mobile"]) {
    expect(has(`help-card-${hidden}`), hidden).toBe(false);
  }
  expect(has("help-section-get-involved")).toBe(false);
  expect(has("help-section-tools")).toBe(false);
});

it("shows member guides when logged in and role guides only to that role", async () => {
  account = { telegramUsername: "member" };
  await render();
  expect(has("help-card-shared-orders")).toBe(true);
  expect(has("help-section-get-involved")).toBe(true);
  expect(has("help-card-organiser-1-create")).toBe(true);
  expect(has("help-section-tools")).toBe(false);
  expect(has("help-login-card")).toBe(false);
  await act(async () => root.unmount());
  account = { telegramUsername: "organiser", organiserStatus: "approved" };
  await render();
  expect(has("help-card-organiser-2-orders")).toBe(true);
  expect(has("help-card-reshippers-2-qr-and-box-checks")).toBe(false);
  // An organiser gets the whole organiser series under "Your tools", and the Uther videos sit in their own section.
  const within = (section: string, card: string) => !!dom.window.document.querySelector(`[data-testid="help-section-${section}"] [data-testid="help-card-${card}"]`);
  expect(within("tools", "organiser-1-create")).toBe(true);
  expect(within("get-involved", "organiser-1-create")).toBe(false);
  expect(within("get-involved", "pool-leader")).toBe(true);
  expect(within("uther", "uther-gb")).toBe(true);
  expect(has("help-card-uther-batch-system")).toBe(false);
  expect(within("group-buys", "uther-gb")).toBe(false);
  expect(within("group-buys", "batch-system")).toBe(true);
});

it("opens a video in the pop-up without autoplay, and /help/<slug> opens it directly", async () => {
  await render("/help/half-kits");
  const video = dom.window.document.querySelector('[data-testid="help-video"]') as HTMLVideoElement;
  expect(video).not.toBeNull();
  expect(video.hasAttribute("autoplay")).toBe(false);
  expect(video.getAttribute("preload")).toBe("metadata");
  expect(video.querySelector("source")?.getAttribute("src")).toBe("/api/help-videos/half-kits#t=0.1");
  await click("help-video-close");
  expect(has("help-video-popup")).toBe(false);
});

it("uses the start of each video as its thumbnail, without playing it", async () => {
  await render();
  const thumb = dom.window.document.querySelector('[data-testid="help-card-batch-system"] video') as HTMLVideoElement;
  expect(thumb.getAttribute("src")).toBe("/api/help-videos/batch-system#t=1.5");
  expect(thumb.getAttribute("preload")).toBe("metadata");
  expect(thumb.hasAttribute("autoplay")).toBe(false);
  expect(thumb.hasAttribute("controls")).toBe(false);
  expect(thumb.muted).toBe(true);
});

it("picks the crypto guide from the exchange and wallet answers, offers its steps and remembers the answer", async () => {
  await render();
  const page = dom.window.document;
  const press = (id: string) => act(async () => { (page.querySelector(`[data-testid="${id}"]`) as HTMLElement).click(); await new Promise(resolve => setTimeout(resolve, 60)); });
  await press("crypto-choice-kraken"); await press("crypto-choice-exodus");
  expect(page.querySelector('[data-testid="help-crypto-play"] video')?.getAttribute("src")).toBe("/api/help-videos/crypto-kraken-to-exodus#t=1.5");
  expect(JSON.parse(dom.window.localStorage.getItem("sp-help-crypto-choice")!)).toEqual({ exchange: "kraken", wallet: "exodus" });
  await press("help-crypto-step-step-4-pay");
  expect(page.querySelector('[data-testid="help-video"] source')?.getAttribute("src")).toBe("/api/help-videos/crypto-kraken-to-exodus-step-4-pay#t=0.1");
  await press("help-video-close");
  await press("help-crypto-play");
  expect(page.querySelector('[data-testid="help-video"] source')?.getAttribute("src")).toBe("/api/help-videos/crypto-kraken-to-exodus#t=0.1");
});

it("filters by title, summary and keywords", async () => {
  await render();
  const input = dom.window.document.querySelector('[data-testid="help-search"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "kit limit");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  expect(has("help-card-batch-system")).toBe(true);
  expect(has("help-card-half-kits")).toBe(false);
});
