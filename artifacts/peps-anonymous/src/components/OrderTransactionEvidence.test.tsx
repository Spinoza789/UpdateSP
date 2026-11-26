import type { Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the existing workspace test harness.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost/" });
function setup() {
  for (const name of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) {
    vi.stubGlobal(name, name === "window" ? dom.window : dom.window[name]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setup();
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { OrderTransactionEvidence } = await import("./OrderTransactionEvidence");
const hash = `0x${"a".repeat(64)}`, sender = `0x${"b".repeat(40)}`, initiator = `0x${"c".repeat(40)}`;
const signature = "3".repeat(88);
const evidence = {
  status: "confirmed", blockTime: "2023-11-14T22:13:20.000Z", checkedAt: "2026-11-25T23:00:00.000Z",
  senderAddress: initiator, transfers: [{ sender, senderType: "wallet" }],
};
let root: Root, container: HTMLDivElement, client: InstanceType<typeof QueryClient>;
function seed(txid = hash, value: unknown = evidence, orderId = "O") {
  client.setQueryData(["organiser-transaction-evidence", "G", orderId, txid], value);
}
async function render(order: { paymentTxHash?: string; testPaymentTxHash?: string; balanceTxHash?: string; paymentCryptoNetwork?: string } = { paymentTxHash: hash }, orderId = "O") {
  await act(async () => root.render(h(QueryClientProvider, { client },
    h(OrderTransactionEvidence, { groupBuyId: "G", orderId, order }))));
}
async function settled(assertion: () => void) {
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    assertion();
  });
}
beforeEach(() => {
  setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => evidence }));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear(); container.remove(); vi.unstubAllGlobals();
});
afterAll(() => dom.window.close());
describe("organiser payment blockchain details", () => {
  it("shows the actual UTC block time, sender wallet and Etherscan transaction/address links", async () => {
    seed(); await render();
    expect(container.querySelector("time")?.dateTime).toBe(evidence.blockTime);
    expect(container.textContent).toContain("22:13:20 UTC");
    expect(container.textContent).not.toContain("25 Nov 2026");
    expect(container.textContent).toContain("Sender wallet");
    expect(container.textContent).toContain("Transaction sender");
    expect(container.querySelector(`a[href="https://etherscan.io/tx/${hash}"]`)?.getAttribute("rel")).toContain("noopener");
    expect(container.querySelector(`a[href="https://etherscan.io/address/${sender}"]`)).not.toBeNull();
    expect(container.querySelector(`a[href="https://etherscan.io/address/${initiator}"]`)).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses Solscan and honestly labels a token account and a different fee payer", async () => {
    const tokenAccount = "6".repeat(44), signer = "7".repeat(44);
    seed(signature, { ...evidence, senderAddress: signer, transfers: [{ sender: tokenAccount, senderType: "token_account" }] });
    await render({ paymentTxHash: signature });
    expect(container.textContent).toContain("Sender token account · owner unavailable");
    expect(container.textContent).toContain("Transaction signer / fee payer");
    expect(container.querySelector(`a[href="https://solscan.io/tx/${signature}"]`)).not.toBeNull();
    expect(container.querySelector(`a[href="https://solscan.io/account/${tokenAccount}"]`)).not.toBeNull();
  });
  it("loads only when the transaction becomes visible", async () => {
    let intersect: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback; }
      observe() {} disconnect = disconnect;
    });
    await render();
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => intersect!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    await settled(() => expect(container.querySelector("time")).not.toBeNull());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/group-buys/G/orders/O/transaction-details?txid="),
      expect.objectContaining({ credentials: "include", signal: expect.any(AbortSignal) }));
    expect(disconnect).toHaveBeenCalled();
  });
  it("keeps the explorer link working and allows retry after a lookup failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Provider unavailable" }) })
      .mockResolvedValue({ ok: true, json: async () => evidence }));
    await render();
    await settled(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain("Provider unavailable"));
    expect(container.querySelector(`a[href="https://etherscan.io/tx/${hash}"]`)).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    await settled(() => expect(container.querySelector("time")).not.toBeNull());
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not substitute payment-confirmation or lookup time when block time is missing", async () => {
    seed(hash, { ...evidence, blockTime: null, senderAddress: null, transfers: [] }); await render();
    expect(container.querySelector("time")).toBeNull();
    expect(container.textContent).toContain("Not available");
    expect(container.textContent).not.toContain("2026");
    expect(container.querySelector("button")?.textContent).toContain("Retry");
  });
  it("never displays the previous order's cached sender on a different order", async () => {
    seed(); await render();
    expect(container.textContent).toContain(sender);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Order not found" }) }));
    await render({ paymentTxHash: hash }, "OTHER");
    expect(container.textContent).not.toContain(sender);
    await settled(() => expect(container.textContent).toContain("Order not found"));
  });
  it("renders test, primary and balance payments, including a balance-only order", async () => {
    const testHash = `0x${"d".repeat(64)}`;
    seed(); seed(testHash); seed(signature);
    await render({ paymentTxHash: hash, testPaymentTxHash: testHash, balanceTxHash: signature });
    expect(container.querySelectorAll("time")).toHaveLength(3);
    expect(container.textContent).toContain("Test payment");
    expect(container.textContent).toContain("Balance payment");
    await render({ balanceTxHash: signature });
    expect(container.querySelectorAll("time")).toHaveLength(1);
  });
  it.each([{ paymentTxHash: "fiat:bank_transfer" }, { paymentTxHash: hash, paymentCryptoNetwork: "BSC" }])("does not look up manual or unsupported-chain references", async order => {
    await render(order);
    expect(fetch).not.toHaveBeenCalled();
    expect(container.querySelector("a")).toBeNull();
  });
});
