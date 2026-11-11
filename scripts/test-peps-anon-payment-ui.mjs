// Fixture-only browser check. No real Admin session, API writes or production bypass.
import assert from "node:assert/strict";
import { chromium } from "../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";

const base = process.env.PAYMENT_UI_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium",
  headless: true, args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => {
  // The proxied Vite dev HMR websocket is not the rendered application's API.
  if (error.message === "WebSocket closed without opened." && error.stack?.includes("vite")) {
    console.warn("Dev-only Vite HMR websocket unavailable; continuing rendered UI checks.");
  } else errors.push(error.message);
});
await page.route("**/__payment-ui-test", route => route.fulfill({
  contentType: "text/html",
  body: `<!doctype html><html><body style="margin:0;background:var(--t-bg);color:var(--t-text)"><div id="fixture" style="padding:24px;max-width:1600px;margin:auto"></div>
  <script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    await import("/src/index.css");
    await import("/src/components/admin/peps-anon-payment/payments.css");
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const {adminAuth} = await import("/src/lib/admin-auth.ts");
    const {default: Component} = await import("/src/components/admin/VendorPaymentsAdmin.tsx");
    const states = ["owed","paid","needs_review","not_owed"];
    const data = {
      vendors:[{id:"fixture",name:"Example Supplier"}],vendorId:"fixture",
      wallets:[{id:"wallet",currency:"USDC",network:"ERC-20",address:"0x1111111111111111111111111111111111111111"}],
      orders:Array.from({length:8},(_,i)=>({
        id:"order"+i,reference:String(12836+i),status:i%3===0?"Shipped":"Submitted",
        paymentState:states[i%4],eligible:i%4===0,stale:i%4===2,paymentId:i%4===1?"receipt":null,
        totalCost:"4210.00",productCost:"4150.00",shippingCost:"60.00",
        submittedAt:"2026-11-11T07:20:05Z",sourceType:"order",sourceId:"fixture-source",
        sourceOrders:[{id:"original"+i,code:String(12836+i),username:"@example_member_"+i}],
        canRemove:i%4===0,removalReason:"Void the supplier payment receipt before removing this submission.",
        reviewToken:"a".repeat(64),
        items:[{productName:"Example product with a long label 10ml",quantity:10,unitCost:"415.00",lineTotal:"4150.00"}],
        profit:{currency:"USD",basis:"product_gross",salesUsd:"5400.00",supplierProductsUsd:"4150.00",amountUsd:i===4?"-25.00":"1250.00",reason:null,
          definition:"Product profit before shipping, discounts, credits and fees; not net profit.",
          lines:[{productName:"Example product with a long label 10ml",salesUsd:"5400.00",amountUsd:"1250.00"}]}
      })),
      payments:[{id:"receipt",txid:"example-historical-transfer",cryptoAmount:"4210",usdAmount:"4210.00",currency:"USDC",network:"ERC-20",
        walletSnapshot:{currency:"USDC",network:"ERC-20",address:"0x2222222222222222222222222222222222222222"},
        orders:[{submissionId:"old-order",reference:"12829",amountUsd:"4210.00"}],paidAt:"2026-11-10",recordedAt:"2026-11-10",recordedBy:"Example Admin",voidedAt:null,voidReason:null}]
    };
    adminAuth.request = async (_path,init={}) => {
      if(init.method) throw new Error("Fixture browser must never write");
      return new Response(JSON.stringify(data));
    };
    ReactDOM.createRoot(document.getElementById("fixture")).render(React.createElement(Component));
  </script></body></html>`,
}));
const id = name => page.getByTestId(name);
const noOverflow = async label => {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  if (size.scroll > size.width + 1) console.log(await page.evaluate(() => Array.from(document.querySelectorAll("*")).map(el => ({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right})).filter(el=>el.right>innerWidth).slice(0,18)));
  assert.ok(size.scroll <= size.width + 1, `${label}: page overflow ${JSON.stringify(size)}`);
};
try {
  await page.goto(`${base}/__payment-ui-test`);
  await id("payment-vendor").selectOption("fixture");
  await id("payment-order-order0").waitFor();
  await noOverflow("desktop");
  await page.screenshot({path:"/tmp/payment-redesign-desktop.png",fullPage:true});
  await page.setViewportSize({width:900,height:850});
  await noOverflow("narrow desktop");
  await page.setViewportSize({width:1280,height:850});
  await id("payment-expand-order0").click();
  await id("payment-detail-next").click();
  await id("payment-order-detail-order1").waitFor();
  await page.screenshot({path:"/tmp/payment-redesign-drawer.png"});
  await page.keyboard.press("Escape");
  await id("payment-state-paid").click();
  assert.equal(await page.locator('tbody tr:visible').count(), 2);
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  assert.equal(await id("payment-state-owed").getAttribute("aria-selected"), "true");
  await id("payment-tab-history").click();
  await id("payment-receipt-expand-receipt").click();
  await page.getByText("Breakdown not recorded for this receipt.",{exact:false}).waitFor();
  await page.keyboard.press("Escape");
  await id("payment-tab-orders").click();
  await id("payment-state-all").click();
  await id("payment-order-order0").check();
  await id("payment-record-open").click();
  await id("payment-wallet").selectOption("wallet");
  await id("payment-amount").fill("4210");
  await id("payment-txid").fill("example-unsent-test-input");
  await id("payment-review").click();
  await id("payment-draft").waitFor();
  await page.keyboard.press("Escape");
  await page.setViewportSize({width:390,height:844});
  await noOverflow("mobile");
  await page.screenshot({path:"/tmp/payment-redesign-mobile.png",fullPage:true});
  await id("payment-expand-order0").click();
  await noOverflow("mobile drawer");
  await page.screenshot({path:"/tmp/payment-redesign-mobile-drawer.png"});
  await page.keyboard.press("Escape");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.setViewportSize({width:1280,height:850});
  await page.screenshot({path:"/tmp/payment-redesign-dark.png",fullPage:true});
  assert.deepEqual(errors, []);
  console.log("PASS: desktop/mobile overflow, order navigation, payment-state tabs, historical receipt, payment review and dark-mode rendering.");
} finally {
  await browser.close();
}
