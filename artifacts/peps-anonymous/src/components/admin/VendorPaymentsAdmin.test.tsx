import { act, createElement } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace test harness.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace test harness.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import { adminAuth } from "../../lib/admin-auth";
let root: Root | undefined;
let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let Component: typeof import("./VendorPaymentsAdmin").default;
const original = adminAuth.request;
const requests: { path: string; method?: string; body: any }[] = [];
const accounts: {
  username: string;
  status: string;
  vendorId: string | null;
  companyName: string;
  contactName: string;
  email: string;
  createdAt: string;
}[] = [
  {
    username: "supplier",
    status: "pending",
    vendorId: null,
    companyName: "Supplier Co",
    contactName: "Person",
    email: "vendor@example.com",
    createdAt: "2026-01-01",
  },
];
before(async () => {
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "Event",
    "Node",
    "MutationObserver",
    "navigator",
    "HTMLButtonElement",
  ])
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: dom.window[key],
    });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  Component = (await import("./VendorPaymentsAdmin")).default;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  document.body.innerHTML = "";
  adminAuth.request = original;
});
after(() => dom.window.close());
function el(id: string) {
  const value = document.querySelector(`[data-testid="${id}"]`);
  assert.ok(value, id);
  return value!;
}
const tok = (id: string) => Buffer.from(id).toString("hex").padEnd(64, "0").slice(0, 64);
const data = {
  vendors: [{ id: "v1", name: "Vendor One" }],
  vendorId: "v1",
  wallets: [
    { id: "w1", currency: "USDT", network: "TRON", address: "address-one" },
  ],
  orders: [
    {
      id: "o1",
      reviewToken: tok("o1"),
      canRemove: true,
      removalReason: null,
      profit: { currency: "USD", basis: "product_gross", salesUsd: "18.20", supplierProductsUsd: "7.00", amountUsd: "11.20", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
      reference: "REF1",
      delivery: { name: "Test Recipient", address: "1 Example Road", country: "GB", phone: "12345", email: "delivery@example.test", carrier: "Royal Mail", trackingNumber: "TRACK123" },
      totalCost: "10.10",
      status: "Submitted",
      stale: false,
      paymentId: null,
    },
    {
      id: "o2",
      reviewToken: tok("o2"),
      canRemove: false,
      removalReason: "This submission has started and is locked.",
      profit: { currency: "USD", basis: "product_gross", salesUsd: "15.00", supplierProductsUsd: "20.00", amountUsd: "-5.00", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
      reference: "REF2",
      totalCost: "20.20",
      // Ordinary transfer tests need an owed order; progressed orders now need historical review.
      status: "Submitted",
      stale: false,
      paymentId: null,
    },
    {
      id: "paid",
      reviewToken: tok("paid"),
      reference: "PAID",
      totalCost: "2",
      status: "Submitted",
      stale: false,
      paymentId: "p1",
      canRemove: false,
      removalReason: "Void the payment receipt before removing this supplier submission.",
      profit: { currency: "USD", basis: "product_gross", salesUsd: null, supplierProductsUsd: null, amountUsd: null, reason: "Customer product prices are ambiguous.", definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
    },
    {
      id: "stale",
      reviewToken: tok("stale"),
      reference: "STALE",
      totalCost: "2",
      status: "Submitted",
      stale: true,
      canRemove: true,
      removalReason: null,
      profit: { currency: "USD", basis: "product_gross", salesUsd: "8.00", supplierProductsUsd: "4.00", amountUsd: "4.00", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
      paymentId: null,
    },
  ],
  payments: [],
};
async function mount() {
  requests.length = 0;
  adminAuth.request = async (path, init = {}) => {
    requests.push({
      path,
      method: init.method,
      body: init.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify(data));
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(Component)));
  await change("payment-vendor", "v1");
}
test("reviews and confirms a corrected supplier submission then refreshes its cost and profit", async () => {
  await mount();
  const ledger = structuredClone(data);
  ledger.orders[0].stale = true;
  const path = "/api/admin/vendor-portal/orders/o1/update";
  adminAuth.request = async (url, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    requests.push({ path: url, method: init.method, body });
    if (url === path) {
      if (body?.previewToken) {
        assert.equal(body.previewToken, tok("updated"));
        ledger.orders[0].stale = false;
        ledger.orders[0].totalCost = "7.00";
        return new Response(JSON.stringify({ ok: true }));
      }
      return new Response(JSON.stringify({
        previewToken: tok("updated"),
        before: { items: [{ productName: "ARA removed", quantity: 4, unitCost: "48.00", lineTotal: "192.00" }], productCost: "192.00", shippingCost: "80.00", totalCost: "272.00" },
        after: { items: [{ productName: "Remaining item", quantity: 1, unitCost: "7.00", lineTotal: "7.00" }], productCost: "7.00", shippingCost: "80.00", totalCost: "87.00" },
      }));
    }
    return new Response(JSON.stringify(ledger));
  };
  await click("payment-refresh");
  await click("payment-expand-o1");
  await click("payment-update-review");
  assert.match(el("payment-update-preview").textContent!, /ARA removed/);
  assert.match(el("payment-update-preview").textContent!, /Remaining item/);
  assert.match(el("payment-update-preview").textContent!, /87\.00/);
  assert.equal(requests.filter(r => r.path === path && r.body?.previewToken).length, 0);
  await click("payment-update-confirm");
  assert.equal(requests.filter(r => r.path === path && r.body?.previewToken).length, 1);
  assert.equal(document.querySelector('[data-testid="payment-update-preview"]'), null);
  assert.match(el("payment-order-detail-o1").textContent!, /7\.00/);
  assert.ok(el("payment-detail-record"));
});
test("record payment footer separates saved supplier totals, selling prices and weighted profit from crypto sent", async () => {
  await mount();
  const ledger: any = structuredClone(data);
  Object.assign(ledger.orders[0], { productCost: "7.00", shippingCost: "3.10" });
  Object.assign(ledger.orders[1], { productCost: "20.00", shippingCost: "0.20" });
  ledger.wallets = [{ id: "w1", currency: "ETH", network: "Ethereum", address: "saved-eth-address" }];
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
    return Response.json(ledger);
  };
  await click("payment-refresh");
  assert.equal(document.querySelector('[data-testid="payment-after-shipping-o1"]'), null);
  assert.equal(document.querySelector('[data-testid="payment-after-shipping-o2"]'), null);
  await click("payment-expand-o1");
  assert.doesNotMatch(el("payment-order-drawer").textContent!, /profit after shipping/i);
  await click("payment-detail-close");
  await click("payment-order-o1");
  await click("payment-order-o2");
  await click("payment-record-open");
  const summary = el("payment-summary");
  assert.ok(summary.closest("footer"));
  assert.match(el("payment-summary-products").textContent!, /\$27\.00/);
  assert.match(el("payment-summary-shipping").textContent!, /\$3\.30/);
  assert.match(el("payment-summary-total").textContent!, /\$30\.30/);
  assert.match(el("payment-summary-sales").textContent!, /\$33\.20/);
  assert.match(el("payment-summary-profit").textContent!, /\$6\.20/);
  assert.match(el("payment-summary-margin").textContent!, /18\.67%/);
  assert.doesNotMatch(summary.textContent!, /profit after shipping|margin after shipping/i);
  assert.match(summary.textContent!, /pass-through/);
  assert.match(summary.textContent!, /USD.*not the crypto amount/s);
  await change("payment-wallet", "w1");
  await change("payment-amount", "0.0123");
  await change("payment-txid", "external-transaction");
  await click("payment-review");
  assert.match(el("payment-draft").textContent!, /0\.0123 ETH/);
  assert.match(el("payment-summary-total").textContent!, /\$30\.30/);
  assert.match(el("payment-summary-profit").textContent!, /\$6\.20/);
  assert.equal(requests.filter(r => r.method === "POST").length, 0);
  await click("payment-edit");
  assert.equal((el("payment-amount") as HTMLInputElement).value, "0.0123");
});
test("record payment summary labels incomplete historical values without presenting partial sales or profit as totals", async () => {
  await mount();
  const ledger: any = structuredClone(data);
  ledger.orders[1].profit = { ...ledger.orders[1].profit, salesUsd: null, amountUsd: null };
  adminAuth.request = async () => Response.json(ledger);
  await click("payment-refresh");
  await click("payment-order-o1");
  await click("payment-order-o2");
  await click("payment-record-open");
  assert.match(el("payment-summary-sales").textContent!, /Unavailable/);
  assert.match(el("payment-summary-profit").textContent!, /Unavailable/);
  assert.match(el("payment-summary-margin").textContent!, /Unavailable/);
  assert.match(el("payment-summary-history-warning").textContent!, /not treated as zero/);
  assert.match(el("payment-summary-total").textContent!, /\$30\.30/);
});
test("shows delivery and starts an external payment for only the opened order", async () => {
  await mount();
  await click("payment-order-o2");
  await click("payment-expand-o1");
  assert.match(el("payment-order-delivery").textContent!, /Test Recipient/);
  assert.match(el("payment-order-delivery").textContent!, /TRACK123/);
  await click("payment-detail-record");
  assert.match(el("payment-record-dialog").textContent!, /1 order/);
  assert.equal(document.querySelector('[data-testid="payment-order-drawer"]'), null);
  assert.equal(requests.filter((r) => r.method === "POST").length, 0);
});
test("opens an order-specific supplier cost modal and refreshes saved supplier costs", async () => {
  await mount();
  const ledger:any = structuredClone(data);
  Object.assign(ledger.orders[0], {items:[{productName:"Example",quantity:2,unitCost:"3.50",lineTotal:"7.00"}],productCost:"7.00",shippingCost:"3.10"});
  adminAuth.request = async (url, init = {}) => {
    const body=init.body ? JSON.parse(String(init.body)):null;
    requests.push({path:url,method:init.method,body});
    if(url==="/api/admin/vendor-payments/orders/o1/costs") {
      assert.equal(body.vendorId,"v1"); assert.equal(body.reviewToken,tok("o1"));
      assert.equal(body.note,"Correct supplier price");
      ledger.orders[0].items[0].unitCost="4.00"; ledger.orders[0].totalCost="11.10";
      return new Response(JSON.stringify({ok:true}));
    }
    return new Response(JSON.stringify(ledger));
  };
  await click("payment-refresh");
  await click("payment-expand-o1");
  await click("payment-edit-costs");
  assert.match(document.body.textContent!,/supplier costs/i);
  await change("supplier-cost-unit-0","4.00");
  await change("supplier-cost-note","Correct supplier price");
  await click("supplier-cost-save");
  assert.equal(requests.filter(r=>r.path.endsWith("/o1/costs")).length,1);
  assert.equal(document.querySelector('[data-testid="supplier-cost-editor"]'),null);
  assert.match(document.body.textContent!,/11\.10/);
});
test("reviews free supplier shipping for an unpaid saved submission without changing its product costs", async () => {
  await mount();
  const ledger: any = structuredClone(data);
  ledger.vendors[0].freeShippingThreshold = 1000;
  Object.assign(ledger.orders[0], { items: [{ productName: "Saved product", quantity: 100, unitCost: "12.50", lineTotal: "1250.00" }],
    productCost: "1250.00", shippingCost: "60.00", totalCost: "1310.00" });
  adminAuth.request = async (path, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    requests.push({ path, method: init.method, body });
    if (path.endsWith("/o1/costs")) {
      assert.equal(body.shippingOnly, true);
      assert.equal(body.shippingCost, "0.00");
      assert.equal(body.items[0].unitCost, "12.50");
      ledger.orders[0].shippingCost = "0.00"; ledger.orders[0].totalCost = "1250.00";
      return Response.json({ ok: true });
    }
    return Response.json(ledger);
  };
  await click("payment-refresh");
  await click("payment-expand-o1");
  await click("payment-edit-costs");
  assert.equal((el("supplier-cost-shipping") as HTMLInputElement).value, "60.00");
  await click("supplier-cost-free-shipping");
  assert.equal((el("supplier-cost-shipping") as HTMLInputElement).value, "0.00");
  assert.match(el("supplier-cost-editor").textContent!, /\$1,250\.00/);
  assert.equal(requests.filter(r => r.method === "POST").length, 0);
  await click("supplier-cost-save");
  assert.equal(requests.filter(r => r.path.endsWith("/o1/costs")).length, 1);
  assert.match(document.body.textContent!, /1,250\.00/);
});
test("downloads selected paid and stale orders without enabling a new payment", async () => {
  await mount();
  let blob:Blob|undefined;
  const create=URL.createObjectURL, revoke=URL.revokeObjectURL;
  const anchorClick=dom.window.HTMLAnchorElement.prototype.click;
  URL.createObjectURL=(value:any)=>{blob=value;return "blob:fs3";};
  URL.revokeObjectURL=()=>{};
  dom.window.HTMLAnchorElement.prototype.click=()=>{};
  try {
    adminAuth.request=async (path,init={})=>{
      const body=init.body?JSON.parse(String(init.body)):null;
      requests.push({path,method:init.method,body});
      if(path.endsWith("/export")) return new Response(JSON.stringify({filename:"supplier.txt",text:"Exact FS3 supplier TXT"}));
      return new Response(JSON.stringify(data));
    };
    await click("payment-order-paid"); await click("payment-order-stale");
    assert.equal((el("payment-record-open") as HTMLButtonElement).disabled,true);
    await click("payment-export-fs3");
    const posted=requests.find(r=>r.path.endsWith("/export"))!;
    assert.deepEqual(posted.body,{vendorId:"v1",submissionIds:["paid","stale"]});
    assert.equal(await blob!.text(),"Exact FS3 supplier TXT");
    assert.equal((el("payment-order-paid") as HTMLInputElement).checked,true);
  } finally {URL.createObjectURL=create;URL.revokeObjectURL=revoke;dom.window.HTMLAnchorElement.prototype.click=anchorClick;}
});
test("reviews historical supplier-paid orders and can clear the audited confirmation", async () => {
  const ledger:any=detailedData("v1",3);
  ledger.orders[0].status="Shipped";
  ledger.orders[1].status="Processing";
  await mountWith(async (path,init={})=>{
    const body=init.body?JSON.parse(String(init.body)):null;
    if(path.endsWith("/acknowledge-paid")) {
      assert.deepEqual(body.orderSnapshots.map((o:any)=>o.submissionId).sort(),["v1-o0","v1-o1"]);
      assert.equal(body.vendorId,"v1"); assert.equal(body.note,"Already paid to supplier");
      assert.ok(body.orderSnapshots.every((o:any)=>o.reviewToken===tok(o.submissionId)));
      for(const o of ledger.orders.slice(0,2)) {o.paymentState="paid";o.eligible=false;
        o.paymentAcknowledgement={amountUsd:o.totalCost,note:body.note,recordedBy:"Admin",recordedAt:"2026-11-16T12:00:00Z"};}
      return new Response(JSON.stringify({ok:true,count:2}));
    }
    if(path.endsWith("/clear-paid")) {
      assert.equal(body.note,"Wrong confirmation");assert.equal(body.vendorId,"v1");
      ledger.orders[0].paymentAcknowledgement=null;ledger.orders[0].paymentState="owed";ledger.orders[0].eligible=true;
      return new Response(JSON.stringify({ok:true}));
    }
    return new Response(JSON.stringify(ledger));
  });
  await change("payment-vendor","v1");
  await click("payment-historical-paid");
  assert.equal(document.querySelector('[data-testid="historical-paid-order-v1-o2"]'),null);
  assert.equal((el("historical-paid-confirm") as HTMLButtonElement).disabled,true);
  await change("historical-paid-note","Already paid to supplier");
  await click("historical-paid-confirm");
  assert.equal(document.querySelector('[data-testid="historical-paid-review"]'),null);
  await click("payment-state-paid");
  await click("payment-expand-v1-o0");
  assert.match(el("payment-paid-acknowledgement").textContent!,/Already paid to supplier/);
  assert.equal((el("payment-edit-costs") as HTMLButtonElement).disabled,true);
  await click("payment-clear-paid");
  await change("payment-clear-paid-note","Wrong confirmation");
  await click("payment-clear-paid-confirm");
  assert.equal(requests.filter(r=>r.path.endsWith("/clear-paid")).length,1);
});
test("reviews selected processed original orders even when supplier fulfilment is Submitted", async () => {
  const ledger:any = detailedData("v1", 4);
  for (const [index, status] of ["Processing", "Shipped", "Completed", "Submitted"].entries()) {
    ledger.orders[index].status = "Submitted";
    ledger.orders[index].sourceOrders = [{ id: `original-${index}`, code: `12${index}`, status }];
    ledger.orders[index].paymentState = index < 3 ? "needs_review" : "owed";
  }
  await mountWith(async (path, init = {}) => {
    if (path.endsWith("/acknowledge-paid")) {
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body.orderSnapshots.map((o:any) => o.submissionId), ["v1-o0", "v1-o1"]);
      for (const order of ledger.orders.slice(0, 2)) {
        order.paymentAcknowledgement = { amountUsd: order.totalCost, note: body.note };
        order.paymentState = "paid";
      }
      return new Response(JSON.stringify({ ok: true, count: 2 }));
    }
    return new Response(JSON.stringify(ledger));
  });
  await change("payment-vendor", "v1");
  await click("payment-order-v1-o0");
  await click("payment-order-v1-o1");
  await click("payment-historical-paid");
  assert.ok(el("historical-paid-order-v1-o0"));
  assert.ok(el("historical-paid-order-v1-o1"));
  assert.equal(document.querySelector('[data-testid="historical-paid-order-v1-o2"]'), null);
  assert.match(el("historical-paid-review").textContent!, /No buyer notifications/);
  assert.equal(requests.filter(r => r.method === "POST").length, 0);
  await change("historical-paid-note", "Supplier was already paid");
  await click("historical-paid-confirm");
  assert.equal(requests.filter(r => r.method === "POST").length, 1);
  assert.match(document.body.textContent!, /Historical supplier payments recorded/);
});
test("cancelled or failed submission updates do not change supplier costs", async () => {
  await mount();
  const ledger = structuredClone(data);
  ledger.orders[0].stale = true;
  let confirms = 0;
  adminAuth.request = async (url, init = {}) => {
    if (url.endsWith("/o1/update")) {
      const body = JSON.parse(String(init.body));
      if (body.previewToken) {
        confirms++;
        return new Response(JSON.stringify({ error: "Order changed. Review again." }), { status: 409 });
      }
      return new Response(JSON.stringify({
        previewToken: tok("corrected"), before: { items: [], totalCost: "10.10" }, after: { items: [], totalCost: "5.00" },
      }));
    }
    return new Response(JSON.stringify(ledger));
  };
  await click("payment-refresh");
  await click("payment-expand-o1");
  await click("payment-update-review");
  await click("payment-update-cancel");
  assert.equal(confirms, 0);
  assert.equal(document.querySelector('[data-testid="payment-update-preview"]'), null);
  await click("payment-update-review");
  await click("payment-update-confirm");
  assert.equal(confirms, 1);
  assert.match(document.body.textContent!, /Order changed\. Review again/);
  assert.equal(document.querySelector('[data-testid="payment-update-preview"]'), null);
  assert.equal(document.querySelector('[data-testid="payment-detail-record"]'), null);
});
test("paid or started submissions cannot be updated from the payment drawer", async () => {
  await mount();
  const ledger = structuredClone(data);
  ledger.orders[0].stale = true;
  ledger.orders[0].paymentId = "paid";
  ledger.orders[1].stale = true;
  ledger.orders[1].status = "Shipped";
  adminAuth.request = async () => new Response(JSON.stringify(ledger));
  await click("payment-refresh");
  await click("payment-expand-o1");
  assert.equal(document.querySelector('[data-testid="payment-update-review"]'), null);
  await click("payment-detail-close");
  await click("payment-expand-o2");
  assert.equal(document.querySelector('[data-testid="payment-update-review"]'), null);
});
test("per-order payment cannot replace an unsaved transfer and paid orders offer a receipt", async () => {
  await mount();
  await click("payment-order-o1");
  await click("payment-record-open");
  await change("payment-txid", "keep-this-transfer");
  await click("payment-record-close");
  await click("payment-expand-o2");
  assert.equal((el("payment-detail-record") as HTMLButtonElement).disabled, true);
  await click("payment-detail-close");
  await click("payment-expand-paid");
  assert.ok(el("payment-detail-receipt"));
  assert.equal(document.querySelector('[data-testid="payment-detail-record"]'), null);
  await click("payment-detail-close");
  await click("payment-record-open");
  assert.equal((el("payment-txid") as HTMLInputElement).value, "keep-this-transfer");
});
async function change(id: string, value: string) {
  await act(async () => {
    fireEvent.change(el(id), { target: { value } });
  });
}

async function click(id: string) {
  await act(async () => {
    fireEvent.click(el(id));
  });
}
test("opens all-vendor profit reporting without selecting a ledger vendor and supports date and vendor controls", async () => {
  requests.length = 0;
  await mountWith(async (path) => {
    requests.push({ path, body: null });
    if (!path.startsWith("/api/admin/vendor-payments/report?")) return new Response(JSON.stringify(data));
    const query = new URL(path, "http://localhost").searchParams;
    const summary = { salesUsd: "100.00", matchedSalesUsd: "100.00", costUsd: "75.00", profitUsd: "25.00", marginPercent: "25.00",
      totalCount: 1, includedCount: 1, excludedCount: 0, unavailableCount: 0, refundCount: 0 };
    return new Response(JSON.stringify({ currency: "USD", timeZone: "Europe/London", dateBasis: "supplier_submission",
      from: query.get("from"), to: query.get("to"), summary, periods: [{ date: query.get("from"), ...summary }], issues: [] }));
  });
  assert.equal((el("payment-vendor") as HTMLSelectElement).value, "");
  await click("payment-tab-report");
  assert.match(el("report-body").textContent!, /25\.00%/);
  assert.ok(!requests.find(r => r.path.includes("report?"))!.path.includes("vendorId="));
  await change("report-vendor", "v1");
  assert.ok(requests.at(-1)!.path.includes("vendorId=v1"));
  assert.equal((el("payment-vendor") as HTMLSelectElement).value, "");
  await click("report-preset-weekly");
  const from = (el("report-from") as HTMLInputElement).value;
  assert.equal(new Date(from + "T12:00:00Z").getUTCDay(), 1);
  await click("report-next");
  assert.notEqual((el("report-from") as HTMLInputElement).value, from);
  await change("report-from", "2099-01-01");
  assert.ok(document.querySelector('[data-testid="report-range-error"]'));
  assert.equal(document.querySelector('[data-testid="report-body"]'), null);
  assert.equal(requests.filter(r => r.method === "POST").length, 0);
});
test("opens order comparisons without a selected vendor and preserves existing payment drafts", async () => {
  await mount();
  await click("payment-order-o1");
  await click("payment-record-open");
  await change("payment-txid", "keep-comparison-draft");
  await click("payment-record-close");
  await click("payment-tab-comparison");
  assert.ok(el("orders-comparison"));
  assert.equal(document.querySelector('[data-testid="payment-summary-selected"]'), null);
  assert.equal(document.querySelector('[data-testid="revenue-profit-report"]'), null);
  await click("payment-tab-orders");
  assert.equal((el("payment-order-o1") as HTMLInputElement).checked, true);
  await click("payment-record-open");
  assert.equal((el("payment-txid") as HTMLInputElement).value, "keep-comparison-draft");
  assert.equal(requests.filter(r => r.method === "POST").length, 0);
});
test("preserves payment drafts and selections while switching to profit reporting", async () => {
  await mount();
  await click("payment-order-o1");
  await click("payment-record-open");
  await change("payment-txid", "unfinished-transfer");
  await click("payment-record-close");
  await click("payment-tab-report");
  await click("payment-tab-orders");
  assert.match(el("payment-selected-count").textContent!, /1 selected/);
  await click("payment-record-open");
  assert.equal((el("payment-txid") as HTMLInputElement).value, "unfinished-transfer");
});
async function review() {
  await click("payment-order-o1");
  await click("payment-order-o2");
  await click("payment-record-open");
  await change("payment-wallet", "w1");
  await change("payment-amount", "30");
  await change("payment-txid", "tx-123");
  await click("payment-review");
}
test("records selected orders with reviewed wallet snapshot", async () => {
  await mount();
  // Paid/stale rows remain selectable for read-only FS3 downloads.
  assert.equal((el("payment-order-paid") as HTMLInputElement).disabled, false);
  assert.equal((el("payment-order-stale") as HTMLInputElement).disabled, false);
  await review();
  assert.ok(document.body.textContent!.includes("30.30"));
  assert.equal(requests.filter((r) => r.method).length, 0);
  await click("payment-confirm");
  assert.deepEqual(requests.find((r) => r.method === "POST")?.body, {
    vendorId: "v1",
    walletId: "w1",
    walletSnapshot: {
      currency: "USDT",
      network: "TRON",
      address: "address-one",
    },
    submissionIds: ["o1", "o2"],
    orderSnapshots: [
      { submissionId: "o1", reviewToken: tok("o1") },
      { submissionId: "o2", reviewToken: tok("o2") },
    ],
    txid: "tx-123",
    cryptoAmount: "30",
  });
});
test("does not claim success on failed record", async () => {
  await mount();
  await review();
  adminAuth.request = async () =>
    new Response(JSON.stringify({ error: "Wallet changed; refresh" }), {
      status: 409,
    });
  await click("payment-confirm");
  assert.ok(
    document
      .querySelector('[role="alert"]')
      ?.textContent?.includes("Wallet changed"),
  );
  assert.ok(!document.body.textContent!.includes("Payment recorded."));
  assert.ok(el("payment-confirm"));
});
test("requires a reason and explicit confirmation to void a receipt", async () => {
  const payment = {
    id: "p1",
    txid: "previous-tx",
    cryptoAmount: "30",
    usdAmount: "30.30",
    currency: "USDT",
    network: "TRON",
    walletSnapshot: data.wallets[0],
    orders: [{ submissionId: "o1", reference: "REF1", amountUsd: "10.10" }],
    paidAt: "2026-01-01",
    recordedAt: "2026-01-01",
    recordedBy: "admin",
    voidedAt: null,
    voidReason: null,
  };
  (data.payments as any[]).push(payment);
  try {
    await mount();
    await click("payment-tab-history");
    await click("payment-receipt-expand-p1");
    const voidButton = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Void record",
    )!;
    await act(async () => fireEvent.click(voidButton));
    assert.ok(
      document.body.textContent!.includes(
        "Only corrects this record; does not reverse transfer",
      ),
    );
    assert.equal(
      (el("payment-void-confirm") as HTMLButtonElement).disabled,
      true,
    );
    await change("payment-void-reason", "Wrong transaction");
    await click("payment-void-confirm");
    assert.deepEqual(
      requests.find((r) => r.method === "POST"),
      {
        path: "/api/admin/vendor-payments/p1/void",
        method: "POST",
        body: { reason: "Wrong transaction" },
      },
    );
  } finally {
    data.payments.length = 0;
  }
});
test("requires a saved vendor wallet before review", async () => {
  const wallets = data.wallets;
  data.wallets = [];
  try {
    await mount();
    await click("payment-wallets-open");
    assert.ok(
      document.body.textContent!.includes(
        "add a payment wallet in their Settings",
      ),
    );
    assert.equal(document.querySelector('[data-testid="payment-review"]'), null);
  } finally {
    data.wallets = wallets;
  }
});
test("malformed dashboard responses show a load error instead of crashing", async () => {
  await mount();
  adminAuth.request = async () =>
    new Response(JSON.stringify({ vendors: data.vendors }));
  const refresh = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Refresh payments & wallets",
  )!;
  await act(async () => {
    fireEvent.click(refresh);
  });
  assert.ok(
    document.body.textContent!.includes("Could not load payment details"),
  );
  assert.equal(document.querySelector('[data-testid="payment-review"]'), null);
});

function text() {
  return document.body.textContent || "";
}
function detailedData(vendorId = "v1", n = 2) {
  return {
    vendors: [
      { id: "v1", name: "Vendor One" },
      { id: "v2", name: "Vendor Two" },
    ],
    vendorId,
    wallets: [{ id: "w1", currency: "USDT", network: "TRON", address: `addr-${vendorId}` }],
    orders: Array.from({ length: n }, (_, i) => ({
      id: `${vendorId}-o${i}`,
      reference: `${vendorId.toUpperCase()}-REF${i}`,
      status: "Submitted",
      stale: false,
      totalCost: "12.34",
      currencyUSD: true,
      paymentId: null,
      sourceType: i === 0 ? "shared" : "order",
      sourceId: `src-${i}`,
      submittedAt: "2026-01-05T10:00:00.000Z",
      sourceOrders: i === 0 ? [{ id: "m1", code: "ORD-111", username: "member_a" }, { id: "m2", code: "ORD-222", username: null }] : [{ id: "m3", code: "ORD-333", username: null }],
      items: [{ productName: "Retatrutide 10mg", quantity: 2, unitCost: "5.00", lineTotal: "10.00" }],
      productCost: "10.00",
      shippingCost: "2.34",
      eligible: true,
      paymentState: "owed",
      reviewReason: null,
      paidAmountUsd: null,
      reviewToken: tok(`${vendorId}-o${i}`),
      canRemove: true,
      removalReason: null,
      profit: { currency: "USD", basis: "product_gross", salesUsd: "18.00", supplierProductsUsd: "10.00", amountUsd: "8.00", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
    })),
    payments: [
      {
        id: "old", txid: "old-tx", cryptoAmount: "1", usdAmount: "1.00", currency: "USDT", network: "TRON",
        walletSnapshot: { currency: "USDT", network: "TRON", address: "historic-address" },
        orders: [{ submissionId: "gone", reference: "LEGACY1", amountUsd: "1.00" }],
        paidAt: "2025-12-01T00:00:00Z", recordedAt: "2025-12-01T00:00:00Z", recordedBy: "admin", voidedAt: null, voidReason: null,
      },
    ],
    summary: {
      currency: "USD",
      owed: { amount: "777.77", count: 63 },
      paid: { amount: "1.00", count: 1 },
      needsReview: { amount: "4.00", count: 2 },
      notOwed: { amount: "0.00", count: 0 },
      unavailableCount: 1,
    },
  };
}
async function mountWith(handler: (path: string, init: RequestInit) => Promise<Response>) {
  requests.length = 0;
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
    return handler(path, init);
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(Component)));
}
const vendorOf = (path: string) => /vendorId=(\w+)/.exec(path)?.[1] ?? "v1";

test("shows whole-ledger server summary, item breakdown and shared constituents", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  assert.ok(text().includes("$777.77"));
  assert.ok(text().includes("63"));
  await click("payment-expand-v1-o0");
  const detail = el("payment-order-detail-v1-o0").textContent!;
  for (const s of ["Retatrutide 10mg", "$5.00", "$10.00", "$2.34", "$12.34", "ORD-111", "member_a", "ORD-222"]) assert.ok(detail.includes(s), s);
});

test("historical receipt without detail says breakdown not recorded", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-tab-history");
  await click("payment-receipt-expand-old");
  assert.ok(el("payment-receipt-old").textContent!.includes("Breakdown not recorded"));
  assert.ok(el("payment-receipt-old").textContent!.includes("historic-address"));
});

test("page selection is scoped, capped and keeps hidden selections", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p), 30))));
  await change("payment-vendor", "v1");
  await click("payment-select-page");
  assert.ok(text().includes("25 selected"));
  assert.ok(text().includes("200"));
  await click("payment-page-next");
  assert.ok(el("payment-hidden-selected").textContent!.includes("25"));
});

test("vendor switch ignores late responses from previous vendor", async () => {
  let releaseV1: () => void = () => {};
  await mountWith((p) => {
    const v = vendorOf(p);
    if (v === "v1" && p.includes("vendorId")) return new Promise((r) => { releaseV1 = () => r(new Response(JSON.stringify(detailedData("v1")))); });
    return Promise.resolve(new Response(JSON.stringify(detailedData(v))));
  });
  await change("payment-vendor", "v1");
  await change("payment-vendor", "v2");
  await act(async () => releaseV1());
  assert.ok(text().includes("V2-REF0"));
  assert.ok(!text().includes("V1-REF0"));
});

test("refresh failure clears stale ledger and offers retry", async () => {
  let fail = false;
  await mountWith(async (p) => fail ? new Response(JSON.stringify({ error: "Server down" }), { status: 500 }) : new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-select-page");
  fail = true;
  await click("payment-refresh");
  assert.ok(text().includes("Server down"));
  assert.ok(!text().includes("V1-REF0"));
  fail = false;
  await click("payment-retry");
  assert.ok(text().includes("V1-REF0"));
  assert.equal(document.querySelector('[data-testid="payment-selected-count"]'), null);
});

test("captures review tokens in draft and keeps review after 409", async () => {
  const withTokens = () => detailedData("v1");
  let conflict = true;
  await mountWith(async (_p, init) => init.method === "POST" && conflict
    ? new Response(JSON.stringify({ error: "Order snapshot changed; refresh" }), { status: 409 })
    : new Response(JSON.stringify(withTokens())));
  await change("payment-vendor", "v1");
  await click("payment-order-v1-o0");
  await click("payment-order-v1-o1");
  await click("payment-record-open");
  await change("payment-wallet", "w1");
  await change("payment-amount", "24.68");
  await change("payment-txid", "tx-tok");
  await click("payment-review");
  await click("payment-confirm");
  const body = requests.find((r) => r.method === "POST")!.body;
  assert.deepEqual(body.orderSnapshots, [
    { submissionId: "v1-o0", reviewToken: tok("v1-o0") },
    { submissionId: "v1-o1", reviewToken: tok("v1-o1") },
  ]);
  assert.deepEqual(body.submissionIds, ["v1-o0", "v1-o1"]);
  assert.ok(text().includes("Order snapshot changed"));
  assert.ok(el("payment-confirm"));
});

test("review shows expandable breakdown for each selected order", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-order-v1-o0");
  await click("payment-record-open");
  await change("payment-wallet", "w1");
  await change("payment-amount", "12.34");
  await change("payment-txid", "tx-d");
  await click("payment-review");
  await click("payment-draft-expand-v1-o0");
  const d = el("payment-draft-detail-v1-o0").textContent!;
  for (const s of ["Retatrutide 10mg", "Product subtotal", "$10.00", "Supplier shipping", "$2.34", "$12.34"]) assert.ok(d.includes(s), s);
});

test("copy without clipboard API shows select-and-copy fallback", async () => {
  const nav = globalThis.navigator as any;
  const prev = nav.clipboard;
  Object.defineProperty(nav, "clipboard", { configurable: true, value: undefined });
  try {
    await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
    await change("payment-vendor", "v1");
    await click("payment-wallets-open");
    await click("payment-copy-w1");
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes("Select and copy"));
  } finally {
    Object.defineProperty(nav, "clipboard", { configurable: true, value: prev });
  }
});

test("shows exact signed product profit beside orders with its definition and sales/cost basis", async () => {
  await mount();
  const ledgerRow = el("payment-order-o1").closest("tr")!.textContent!;
  assert.ok(ledgerRow.includes("$11.20"));
  assert.ok(ledgerRow.includes("$18.20"));
  assert.ok(el("payment-profit-o1").textContent!.includes("$11.20"));
  const soldPrice = el("payment-sold-price-o1");
  assert.ok(soldPrice.textContent!.includes("Sold price"));
  assert.ok(soldPrice.textContent!.includes("$18.20"));
  assert.match(soldPrice.textContent!, /products only/i);
  assert.match(soldPrice.closest("table")!.textContent!, /Supplier cost/);
  await click("payment-expand-o1");
  const profitDetail = el("payment-profit-detail-o1").textContent!;
  assert.ok(profitDetail.includes("before shipping"));
  assert.ok(profitDetail.includes("Customer product sales: $18.20"));
  assert.ok(profitDetail.includes("Supplier product cost: $7.00"));
  const negativeRow = el("payment-order-o2").closest("tr")!.textContent!;
  assert.ok(negativeRow.includes("-$5.00"));
  assert.ok(negativeRow.includes("$15.00"));
  const unavailable = el("payment-order-paid").closest("tr")!.textContent!;
  assert.ok(unavailable.includes("Unavailable"));
  assert.ok(unavailable.includes("Customer product prices are ambiguous."));
  assert.ok(el("payment-sold-price-paid").textContent!.includes("Unavailable"));
});

test("removal requires confirmation, uses the supplier submission endpoint, and preserves customer order", async () => {
  await mount();
  await click("payment-order-o1");
  await click("payment-record-open");
  await change("payment-wallet", "w1");
  await change("payment-amount", "10");
  await change("payment-txid", "prepared-tx");
  await click("payment-record-close");
  await click("payment-expand-o1");
  await click("payment-remove-o1");
  assert.ok(el("payment-remove-confirmation").textContent!.includes("REF1"));
  assert.ok(el("payment-remove-confirmation").textContent!.includes("keeps the customer order"));
  assert.ok(el("payment-remove-confirmation").textContent!.includes("does not cancel"));
  assert.equal((el("payment-record-open") as HTMLButtonElement).disabled, true);
  assert.equal(document.querySelector('[data-testid="payment-draft"]'), null);
  assert.equal(requests.filter((r) => r.method === "POST").length, 0);
  assert.equal(requests.filter((r) => r.method === "DELETE").length, 0);
  await click("payment-remove-cancel");
  await click("payment-remove-o1");
  let refreshCount = 0;
  let deleted = false;
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: null });
    if (init.method === "DELETE") { deleted = true; return new Response(null, { status: 204 }); }
    refreshCount++;
    return new Response(JSON.stringify({ ...data, orders: deleted ? data.orders.filter((order: any) => order.id !== "o1") : data.orders }));
  };
  await click("payment-remove-confirm");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await act(async () => {});
  assert.ok(requests.some((r) => r.path === "/api/admin/vendor-portal/orders/o1" && r.method === "DELETE"));
  assert.ok(text().includes("Supplier submission REF1 removed"));
  assert.ok(refreshCount > 0);
  assert.equal(document.querySelector('[data-testid="payment-order-o1"]'), null);
  assert.equal(document.querySelector('[data-testid="payment-selected-count"]'), null);
});

test("failed removal preserves the row and reports error without success", async () => {
  await mount();
  await click("payment-expand-o1");
  await click("payment-remove-o1");
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: null });
    if (init.method === "DELETE") return new Response(JSON.stringify({ error: "Submission changed" }), { status: 409 });
    return new Response(JSON.stringify(data));
  };
  await click("payment-remove-confirm");
  assert.ok(text().includes("Submission changed"));
  assert.ok(!text().includes("Supplier submission removed"));
  assert.ok(el("payment-order-o1"));
});

test("paid and started submissions cannot be removed", async () => {
  await mount();
  await click("payment-expand-paid");
  assert.equal((el("payment-remove-paid") as HTMLButtonElement).disabled, true);
  assert.ok(el("payment-remove-paid").textContent!.includes("Void the payment receipt"));
  await click("payment-detail-close");
  await click("payment-expand-o2");
  assert.equal((el("payment-remove-o2") as HTMLButtonElement).disabled, true);
  assert.ok(el("payment-remove-o2").textContent!.includes("started"));
});
test("Admin override requires a reason and sends it only after explicit confirmation", async () => {
  let deleted = false;
  const overrideOrder = { ...data.orders[0], status: "Shipped", canRemove: true, requiresRemovalOverride: true };
  await mountWith(async (path, init = {}) => {
    if (init.method === "DELETE") {
      requests.push({ path, method: init.method, body: JSON.parse(String(init.body)) });
      deleted = true;
      return new Response(JSON.stringify({ ok: true }));
    }
    return new Response(JSON.stringify({ ...data, orders: deleted ? [] : [overrideOrder] }));
  });
  await change("payment-vendor", "v1");
  await click("payment-expand-o1");
  await click("payment-remove-o1");
  assert.match(el("payment-remove-confirmation").textContent!, /does not stop a parcel already shipped/);
  assert.equal((el("payment-remove-confirm") as HTMLButtonElement).disabled, true);
  await change("payment-remove-reason", "  Duplicate shipment handled outside portal  ");
  assert.equal((el("payment-remove-confirm") as HTMLButtonElement).disabled, false);
  assert.equal(deleted, false);
  await click("payment-remove-confirm");
  assert.deepEqual(requests.find(r => r.method === "DELETE")?.body, { override: true, reason: "Duplicate shipment handled outside portal" });
  assert.equal(document.querySelector('[data-testid="payment-order-o1"]'), null);
});

test("switching vendors clears removal confirmation and stale removal cannot act", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-expand-v1-o0");
  await click("payment-remove-v1-o0");
  await change("payment-vendor", "v2");
  assert.equal(document.querySelector('[data-testid="payment-remove-confirmation"]'), null);
  assert.ok(!text().includes("V1-REF0"));
});

for (const [label, bad] of [["missing", undefined], ["malformed", "NOT-A-SHA"]] as const) {
  test(`${label} review token blocks review and POST while history still renders`, async () => {
    await mountWith(async (p) => {
      const d: any = detailedData(vendorOf(p));
      if (bad === undefined) delete d.orders[0].reviewToken; else d.orders[0].reviewToken = bad;
      return new Response(JSON.stringify(d));
    });
    await change("payment-vendor", "v1");
    await click("payment-order-v1-o0");
    await click("payment-order-v1-o1");
    await click("payment-record-open");
    await change("payment-wallet", "w1");
    await change("payment-amount", "24.68");
    await change("payment-txid", "tx-bad");
    assert.equal((el("payment-review") as HTMLButtonElement).disabled, true);
    assert.ok(el("payment-token-warning").textContent!.includes("Refresh"));
    await click("payment-review");
    assert.equal(document.querySelector('[data-testid="payment-draft"]'), null);
    assert.equal(requests.filter((r) => r.method === "POST").length, 0);
    await click("payment-record-close");
    await click("payment-tab-history");
    await click("payment-receipt-expand-old");
    assert.ok(el("payment-receipt-old").textContent!.includes("Breakdown not recorded"));
    assert.ok(el("payment-receipt-old").textContent!.includes("LEGACY1"));
  });
}

test("order tabs filter supplier states and history keeps the list search and selection", async () => {
  await mount();
  assert.equal(document.querySelector('[data-testid="payment-wallet"]'), null);
  assert.equal(document.querySelector('[data-testid="payment-copy-w1"]'), null);
  await click("payment-order-o1");
  await click("payment-state-paid");
  assert.equal(document.querySelector('[data-testid="payment-order-o1"]'), null);
  assert.ok(el("payment-order-paid"));
  assert.match(el("payment-hidden-selected").textContent!, /1/);
  await click("payment-state-all");
  await change("payment-filter-search", "REF1");
  await click("payment-tab-history");
  await click("payment-tab-orders");
  assert.equal((el("payment-filter-search") as HTMLInputElement).value, "REF1");
  assert.equal((el("payment-order-o1") as HTMLInputElement).checked, true);
  assert.equal(document.querySelector('[data-testid="payment-order-o2"]'), null);
  await click("payment-filter-clear");
  assert.ok(el("payment-order-o2"));
});

test("one drawer follows the filtered set and restores focus without changing selection", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p), 30))));
  await change("payment-vendor", "v1");
  await click("payment-select-page");
  const trigger = el("payment-expand-v1-o0") as HTMLButtonElement;
  trigger.focus();
  await click("payment-expand-v1-o0");
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
  assert.equal((el("payment-detail-prev") as HTMLButtonElement).disabled, true);
  await click("payment-detail-next");
  assert.ok(el("payment-order-detail-v1-o1"));
  await click("payment-detail-close");
  assert.equal(document.activeElement, trigger);
  assert.match(el("payment-selected-count").textContent!, /25/);
});

test("dirty payment fields survive close and refresh cannot discard a reviewed draft", async () => {
  await mount();
  await review();
  await click("payment-record-close");
  const before = requests.length;
  await click("payment-refresh");
  assert.equal(requests.length, before, "refresh must not silently clear selected reviewed orders");
  await click("payment-record-open");
  assert.ok(el("payment-draft"));
  await click("payment-edit");
  assert.equal((el("payment-txid") as HTMLInputElement).value, "tx-123");
});

test("changing vendors with a dirty transfer requires explicit discard", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-order-v1-o0");
  await click("payment-record-open");
  await change("payment-txid", "unsaved");
  await click("payment-record-close");
  await change("payment-vendor", "v2");
  assert.equal((el("payment-vendor") as HTMLSelectElement).value, "v1");
  await click("payment-discard-cancel");
  await click("payment-record-open");
  assert.equal((el("payment-txid") as HTMLInputElement).value, "unsaved");
  await click("payment-record-close");
  await change("payment-vendor", "v2");
  await click("payment-discard-confirm");
  assert.equal((el("payment-vendor") as HTMLSelectElement).value, "v2");
  assert.equal(document.querySelector('[data-testid="payment-selected-count"]'), null);
  assert.equal(document.querySelector('[data-testid="payment-order-v1-o0"]'), null);
});

test("discarding a transfer requires confirmation and enables a fresh ledger load", async () => {
  await mount();
  await review();
  await click("payment-record-discard");
  await click("payment-record-discard-cancel");
  assert.ok(el("payment-draft"));
  await click("payment-record-discard");
  await click("payment-record-discard-confirm");
  assert.equal(document.querySelector('[data-testid="payment-record-dialog"]'), null);
  assert.equal((el("payment-refresh") as HTMLButtonElement).disabled, false);
  await click("payment-record-open");
  assert.equal((el("payment-txid") as HTMLInputElement).value, "");
});

test("consulting another Admin tab hides dialogs but retains the unsaved record", async () => {
  await mount();
  await review();
  const before = requests.length;
  await act(async () => { root!.render(createElement(Component, { active: false })); });
  assert.equal(document.querySelector('[role="dialog"]'), null);
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  assert.equal(requests.length, before);
  await act(async () => { root!.render(createElement(Component, { active: true })); });
  assert.ok(el("payment-draft"));
  assert.match(el("payment-draft").textContent!, /tx-123/);
});
