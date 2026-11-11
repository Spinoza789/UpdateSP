// Browser-only fixtures: no real Admin authentication or import writes.
import assert from "node:assert/strict";
import { chromium } from "../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const mutations = [];
const errors = [];
page.on("pageerror", e => {
  if (!(e.message === "WebSocket closed without opened." && e.stack?.includes("vite"))) errors.push(e.message);
});
await page.route("**/api/**", route => {
  const req = route.request();
  if (req.method() !== "GET") mutations.push(req.url());
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(
    req.url().includes("status") ? { status: "idle", total: 0, processed: 0 } : [],
  ) });
});
await page.route("**/__coa-import-test", route => route.fulfill({
  contentType: "text/html",
  body: `<!doctype html><html><body style="background:#111827;color:white"><div id="root"></div><script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
    window.__vite_plugin_react_preamble_installed__=true;
    await import("/src/index.css");
    const React=(await import("/node_modules/.vite/deps/react.js")).default;
    const {createRoot}=(await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const {LabTestsTab}=await import("/src/components/LabTestsTab.tsx");
    createRoot(document.getElementById("root")).render(React.createElement(LabTestsTab,{secret:"fixture-only"}));
  </script></body></html>`,
}));
try {
  await page.goto(base + "/__coa-import-test");
  await page.getByRole("button", { name: /Bulk URL Import/ }).click();
  const report = "https://verify.janoshik.com/tests/249731-Retatrutide_40mg_RE401023_D3DUW96M2J1B";
  await page.locator("textarea").first().fill(report);
  await page.getByRole("alert").filter({ hasText: /Janoshik blocks/ }).waitFor();
  await page.getByRole("button", { name: "Open Janoshik Bulk Browser Importer" }).click();
  const helper = page.locator("#janoshik-bulk-browser-importer");
  await helper.getByText("Set up once:", { exact: true }).waitFor();
  assert.match(await helper.locator("a[draggable]").getAttribute("href"), /^javascript:/);
  assert.equal(await page.locator("textarea").first().inputValue(), report);
  assert.equal(mutations.length, 0, "Blocked report must not trigger an import mutation");
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "/tmp/coa-browser-import-routing.png" });
  console.log("PASS: Janoshik warning, browser-helper opening, usable bookmark link, preserved URLs and no accidental import writes.");
} catch (error) {
  console.error("Browser errors:", errors);
  console.error("Visible text:", (await page.locator("body").innerText()).slice(0, 1500));
  throw error;
} finally { await browser.close(); }
