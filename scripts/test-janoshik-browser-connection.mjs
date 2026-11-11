// Real cross-origin tabs and the actual generated bookmarklet/receiver.
// All Janoshik downloads and import/auth APIs are browser fixtures: no live writes.
// Run: pnpm --filter @workspace/api-server exec tsx ../../scripts/test-janoshik-browser-connection.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { chromium } from "../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";
import { securityHeaders } from "../artifacts/api-server/src/lib/http-security.ts";

const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const express = require("express");
const fixture = express();
fixture.use(securityHeaders);
fixture.use((_req, res) => res.send("Header fixture"));
const server = createServer(fixture);
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const policyBase = `http://127.0.0.1:${server.address().port}`;
const base = "https://coa-import.test";
const report = "https://verify.janoshik.com/tests/fixture";
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext();
const errors = [];
const imports = [];
let brokenPolicy = true;
context.on("page", page => page.on("pageerror", error => {
  if (!(error.message === "WebSocket closed without opened." && error.stack?.includes("vite"))) errors.push(error.message);
}));
// An isolated origin avoids the preview proxy's external-navigation guard.
// All app modules still come from the running Vite server.
await context.route(base + "/**", async route => {
  const url = new URL(route.request().url());
  const response = await fetch("http://127.0.0.1:21504" + url.pathname + url.search);
  return route.fulfill({
    contentType: response.headers.get("content-type") || "text/plain",
    status: response.status,
    body: Buffer.from(await response.arrayBuffer()),
  });
});
await context.route("https://verify.janoshik.com/**", route => route.fulfill(
  route.request().url().endsWith(".png")
    ? { contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }
    : { contentType: "text/html", body: '<!doctype html><title>Janoshik fixture</title><img src="/tests/img/fixture.png">' },
));
await context.route("**/api/**", route => {
  const req = route.request();
  const path = new URL(req.url()).pathname;
  let body = [];
  if (path === "/api/admin/security/status") body = { twoFactorEnabled: true };
  else if (path === "/api/admin/auth/me") body = { username: "fixture", csrfToken: "fixture-csrf" };
  else if (path === "/api/admin/lab-tests/bookmarklet-import" && req.method() === "POST") {
    imports.push(req.postDataBuffer().toString());
    body = { id: 1, peptideName: "Fixture Retatrutide", purityPct: 99.9 };
  } else if (req.method() !== "GET") throw new Error(`Unexpected mutation ${req.method()} ${path}`);
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
});
await context.route(url => url.pathname === "/sleepingpepisadmin/janoshik-receiver", async route => {
  console.log("Serving receiver fixture with", brokenPolicy ? "old isolation" : "fixed policy");
  const path = new URL(route.request().url()).pathname;
  const policy = await fetch(policyBase + path);
  await route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
      window.__vite_plugin_react_preamble_installed__=true;
      await import("/src/index.css");
      const React=(await import("/node_modules/.vite/deps/react.js")).default;
      const {createRoot}=(await import("/node_modules/.vite/deps/react-dom_client.js")).default;
      const {default: Receiver}=await import("/src/pages/JanoshikReceiver.tsx");
      createRoot(document.getElementById("root")).render(React.createElement(Receiver));
    </script></body></html>`,
    headers: { "cross-origin-opener-policy": brokenPolicy ? "same-origin" : policy.headers.get("cross-origin-opener-policy") },
  });
});
await context.route("**/__janoshik-connection-fixture", route => route.fulfill({
  contentType: "text/html",
  body: `<!doctype html><html><body><div id="root"></div><script type="module">
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
  const setup = await context.newPage();
  await setup.goto(base + "/__janoshik-connection-fixture");
  await setup.getByRole("button", { name: /Bulk Janoshik Importer/ }).click();
  const href = await setup.locator("#janoshik-bulk-browser-importer a[draggable]").getAttribute("href");
  assert.match(href, /^javascript:/);
  const code = decodeURIComponent(href.slice("javascript:".length));

  // Prove the live site's previous header reproduces the severed connection.
  const brokenWorker = await context.newPage();
  await brokenWorker.goto(report);
  const brokenPopupPromise = brokenWorker.waitForEvent("popup");
  await brokenWorker.evaluate(code => { (0, eval)(code); }, code);
  const broken = await brokenPopupPromise;
  await broken.getByText("No Janoshik tab is connected", { exact: true }).waitFor();
  assert.equal(await broken.evaluate(() => window.opener === null), true);
  assert.equal(imports.length, 0);
  await broken.close();
  await brokenWorker.close();

  // Apply the real fixed middleware and reuse the unmodified bookmarklet.
  brokenPolicy = false;
  const worker = await context.newPage();
  await worker.goto(report);
  const popupPromise = worker.waitForEvent("popup");
  await worker.evaluate(code => { (0, eval)(code); }, code);
  const popup = await popupPromise;
  await popup.getByText("Connected to your Janoshik tab", { exact: true }).waitFor({ timeout: 30_000 });
  assert.equal(await popup.evaluate(() => window.opener !== null), true);
  await popup.locator("textarea").fill(report);
  await popup.getByRole("button", { name: "Start import", exact: true }).click();
  await popup.getByText("Fixture Retatrutide", { exact: true }).waitFor({ timeout: 15_000 });
  assert.equal(imports.length, 1);
  assert.ok(imports[0].includes('name="files"'));
  assert.ok(imports[0].includes(report));
  assert.deepEqual(errors, []);
  await popup.screenshot({ path: "/tmp/janoshik-connected-fixture.png" });
  console.log("PASS: Reproduced broken production COOP; fixed header preserved opener, real bookmarklet handshook, certificate returned and one authenticated import submitted (all fixtures).");
} catch (error) {
  console.error("Browser errors:", errors);
  for (const page of context.pages()) {
    console.error("Page:", page.url(), (await page.locator("body").innerText().catch(() => "")).slice(0, 1400));
  }
  throw error;
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
