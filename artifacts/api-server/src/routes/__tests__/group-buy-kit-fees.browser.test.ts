import { describe, it, expect } from "vitest";
import { chromium, expect as browserExpect } from "@playwright/test";
import { existsSync } from "node:fs";

// Read-only browser fixtures. No real account, order or payment is changed.
describe.skipIf(process.env.KIT_FEE_BROWSER_TESTS !== "1")("member kit-fee ordering screens", () => {
  it("shows fees on both screens, updates quantities, reloads and blocks missing quotes", async () => {
    const browser = await chromium.launch({
      headless: true,
      executablePath: existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const base = process.env.KIT_FEE_BROWSER_BASE_URL!;
      expect(base).toBeTruthy();
      const hookModule = await (await page.request.get(`${base}/src/hooks/use-group-buy-products.ts`)).text();
      const queryModule = hookModule.match(/from "([^"]*@tanstack_react-query[^"]*)"/)?.[1];
      expect(queryModule).toBeTruthy();
      let failPrices = false;
      let fullHalfKitFees = true;
      const errors: string[] = [];
      page.on("pageerror", error => {
        if (!error.message.includes("WebSocket")) {
          errors.push(error.message);
          console.error("Browser fixture error:", error.stack);
        }
      });
      page.on("response", response => {
        if (response.status() >= 400) console.error("Browser response:", response.status(), response.url());
      });
      const group = {
        id: "7M9AL", name: "Synthetic kit-fee group", currency: "USD", status: "active",
        shippingOptions: [], organiserId: "owner", allowCredits: false,
      };
      await page.addInitScript(() => {
        if (!localStorage.getItem("peps-order-draft")) localStorage.setItem("peps-order-draft", JSON.stringify({
          version: 0,
          state: {
            groupBuyId: "7M9AL", telegramUsername: "fixture_member",
            deliveryMethodId: "post", deliveryMethod: "Post", deliveryPrice: 3,
            shippingCountry: "United Kingdom",
            lineItems: [{ id: "line", productId: "p", productName: "Synthetic kit", quantity: 2, unitPrice: 100, lineTotal: 200 }],
          },
        }));
      });
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (!url.pathname.startsWith("/api/")) return route.continue();
        const path = url.pathname.slice(4);
        let body: unknown = [];
        let status = 200;
        if (path === "/account/me") body = {
          telegramUsername: "fixture_member", country: "United Kingdom", credits: 0,
          verificationRequired: false, rulesetVersion: 1, ruleAcceptedVersion: 1,
        };
        else if (path === "/group-buys") body = [group];
        else if (path.endsWith("/products") && path.includes("/group-buys/")) {
          status = failPrices ? 503 : 200;
          body = failPrices ? { error: "Unavailable" } : [
            { id: "p", name: "Synthetic kit", price: 100, feePerKit: 3, chargeFullFeeOnHalfKit: fullHalfKitFees, category: "Kits" },
          ];
        }
        else if (path.endsWith("/delivery-methods")) body = [{ id: "post", name: "Post", price: 3 }];
        else if (path.endsWith("/direct-shipping-info")) body = { enabled: false };
        else if (path.endsWith("/half-kit-offers")) body = { group, offers: [], orders: [], creditsBalance: 0 };
        else if (path.endsWith("/testing")) body = { contributions: { pending: 0 }, pools: [] };
        else if (path.endsWith("/capacity") || path.endsWith("/popularity") || path === "/config") body = {};
        await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      });
      // Mount the actual pages in a browser-only document, without the unrelated
      // Help page's development instrumentation compilation error in App imports.
      await page.route("**/__kit-fee-fixture?*", route => {
        const review = new URL(route.request().url()).searchParams.get("screen") === "review";
        return route.fulfill({ contentType: "text/html", body: `<html><body><div id="root"></div>
          <script type="module">
          import RefreshRuntime from "/@react-refresh";
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => type => type;
          window.__vite_plugin_react_preamble_installed__ = true;
          </script><script type="module">
          import React from "/node_modules/.vite/deps/react.js";
          import ReactDOM from "/node_modules/.vite/deps/react-dom_client.js";
          import {QueryClient, QueryClientProvider} from ${JSON.stringify(queryModule)};
          import "/src/index.css";
          import Page from "/src/pages/${review ? "Review" : "OrderForm"}.tsx";
          const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
          ReactDOM.createRoot(document.getElementById("root")).render(
            React.createElement(QueryClientProvider,{client},React.createElement(Page)));
          </script></body></html>` });
      });
      await page.goto(`${base}/__kit-fee-fixture?gbId=7M9AL`);
      const total = page.getByRole("region", { name: "Order total" });
      await browserExpect(total).toContainText("Kit fees", { timeout: 30000 }).catch(async error => {
        console.error("Fixture body:", await page.locator("body").innerText(), errors);
        throw error;
      });
      await browserExpect(total).toContainText("$6.00");
      await browserExpect(total).toContainText("$209.00");
      await page.evaluate(`import("/src/hooks/use-draft-store.ts").then(({useDraftStore}) =>
        useDraftStore.getState().updateLineItem("line", {quantity:0.5}))`);
      await browserExpect(total).toContainText("$3.00");
      await browserExpect(total).toContainText("$56.00");
      await page.goto(`${base}/__kit-fee-fixture?gbId=7M9AL&screen=review`);
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$3.00", { timeout: 30000 });
      await page.reload();
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$3.00", { timeout: 30000 });
      await page.evaluate(`import("/src/hooks/use-draft-store.ts").then(({useDraftStore}) =>
        useDraftStore.getState().updateLineItem("line", {quantity:3}))`);
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$9.00");
      await page.evaluate(`import("/src/hooks/use-draft-store.ts").then(({useDraftStore}) =>
        useDraftStore.getState().updateLineItem("line", {quantity:1.5}))`);
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$6.00");
      await page.evaluate(`import("/src/hooks/use-draft-store.ts").then(({useDraftStore}) =>
        useDraftStore.getState().updateLineItem("line", {quantity:0.5}))`);
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$3.00");
      fullHalfKitFees = false;
      await page.reload();
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$1.50", { timeout: 30000 });
      fullHalfKitFees = true;
      await page.reload();
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$3.00", { timeout: 30000 });
      await page.setViewportSize({ width: 390, height: 844 });
      await browserExpect(page.getByTestId("text-review-kit-fees")).toBeVisible();
      failPrices = true;
      await page.reload();
      await browserExpect(page.getByRole("alert").filter({ hasText: "Could not load product prices and kit fees" })).toBeVisible();
      await browserExpect(page.getByRole("button", { name: /Place Order|Submit Order|Update Order|Save Changes/i }).last()).toBeDisabled();
      failPrices = false;
      await page.getByRole("button", { name: "Retry kit fees", exact: true }).click();
      await browserExpect(page.getByTestId("text-review-kit-fees")).toContainText("$3.00");
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 120000);
});
