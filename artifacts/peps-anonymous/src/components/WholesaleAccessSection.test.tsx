import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
vi.mock("@/components/PaymentPanel", () => ({
  default: (props: any) => React.createElement("div", {
    "data-payment-prefix": props.apiPrefix, "data-total": props.grandTotal,
  }),
}));
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement"])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
(globalThis as any).React = React;
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { WholesaleAccessSection } = await import("./WholesaleAccessSection");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function render(data: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(data)));
  await act(async () => root.render(h(WholesaleAccessSection)));
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
}
it("shows the configured $5 fee and $5 credit, never the old $50 explanation", async () => {
  await render({ request: null, accessFee: 5 });
  expect(host.textContent).toContain("Pay the $5 access fee.");
  expect(host.textContent).toContain("The full $5 is added back");
  expect(host.textContent).not.toContain("$50");
  expect(host.textContent).not.toContain("lowest available shipping");
});
it("follows later Admin fee changes without hardcoded pricing", async () => {
  await render({ request: null, accessFee: 12.5 });
  expect(host.textContent).toContain("$12.5 access fee");
  expect(host.textContent).not.toContain("$5 access fee");
});
it("does not invent a fee when one is not configured", async () => {
  await render({ request: null, accessFee: null });
  expect(host.textContent).toContain("access fee shown on your request");
  expect(host.textContent).not.toMatch(/\$\d/);
});

const original = {
  id: 100, amountUsd: 50, status: "pending", paymentTestAmount: 1.74,
  testPaymentTxHash: null, paymentTxHash: null, paymentCryptoNetwork: null,
  paymentCryptoCurrency: null, createdAt: "", rejectionReason: null,
};
const review = { outdatedHigherFee: true, canReplace: true, paymentStarted: false };
function button(text: string) {
  const found = [...host.querySelectorAll("button")].find(element => element.textContent?.includes(text));
  expect(found, `Missing button: ${text}`).toBeDefined();
  return found!;
}
async function click(element: HTMLElement) {
  await act(async () => { element.click(); });
}
it("hides payment instructions until an untouched higher quote is replaced with confirmation", async () => {
  const calls: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url, init) => {
    if (String(url).endsWith("/replace-outdated")) {
      calls.push(JSON.parse(init.body));
      return Response.json({ request: { ...original, id: 101, amountUsd: 5 }, accessFee: 5,
        feeReview: { outdatedHigherFee: false, canReplace: false, paymentStarted: false } });
    }
    return Response.json({ request: original, accessFee: 5, feeReview: review });
  }));
  await act(async () => root.render(h(WholesaleAccessSection)));
  expect(host.textContent).toContain("older, higher fee");
  expect(host.querySelector("[data-payment-prefix]")).toBeNull();
  expect(button("Replace with current $5 fee").disabled).toBe(true);
  await click(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  await click(button("Replace with current $5 fee"));
  expect(calls).toEqual([{ requestId: 100, expectedFee: 5, confirmsNoPayment: true }]);
  const panel = host.querySelector<HTMLElement>("[data-payment-prefix]");
  expect(panel?.dataset.paymentPrefix).toBe("/api/account/wholesale-access/requests/101");
  expect(panel?.dataset.total).toBe("5");
  expect(host.textContent).not.toContain("older, higher fee");
});
it("warns before resuming a payment in progress without offering a reset", async () => {
  await render({ request: { ...original, testPaymentTxHash: "recorded", paymentCryptoCurrency: "USDC" },
    accessFee: 5, feeReview: { ...review, canReplace: false, paymentStarted: true } });
  expect(host.querySelector('input[type="checkbox"]')).toBeNull();
  expect(host.querySelector("[data-payment-prefix]")).toBeNull();
  await click(button("Continue original $50 request"));
  expect(host.querySelector<HTMLElement>("[data-payment-prefix]")?.dataset.paymentPrefix)
    .toBe("/api/account/wholesale-access/requests/100");
  expect(host.querySelector<HTMLElement>("[data-total]")?.dataset.total).toBe("50");
});
it("shows reset conflicts and refreshes payment evidence rather than overwriting it", async () => {
  let started = false;
  vi.stubGlobal("fetch", vi.fn(async url => {
    if (String(url).endsWith("/replace-outdated")) {
      started = true;
      return Response.json({ error: "Payment already started. Request unchanged." }, { status: 409 });
    }
    return Response.json({ request: started ? { ...original, testPaymentTxHash: "recorded" } : original,
      accessFee: 5, feeReview: started ? { ...review, canReplace: false, paymentStarted: true } : review });
  }));
  await act(async () => root.render(h(WholesaleAccessSection)));
  await click(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  await click(button("Replace with current $5 fee"));
  expect(host.textContent).toContain("Payment already started. Request unchanged.");
  expect(host.querySelector('input[type="checkbox"]')).toBeNull();
  expect(button("Continue original $50 request")).toBeDefined();
});
it("preserves confirmed historical fees and credit", async () => {
  await render({ request: { ...original, status: "confirmed" }, accessFee: 5,
    feeReview: { outdatedHigherFee: false, canReplace: false, paymentStarted: true } });
  expect(host.textContent).toContain("Your $50 fee has been confirmed");
  expect(host.querySelector("[data-payment-prefix]")).toBeNull();
  expect(host.textContent).not.toContain("Replace with");
});
