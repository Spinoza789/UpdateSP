import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchGroupOrderProducts } from "./use-group-buy-products";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("loads the saved group rates with account credentials and cancellation", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/group-buys/7M9AL/products");
    assert.equal(options?.credentials, "include");
    assert.equal(options?.signal, controller.signal);
    return Response.json([{ id: "p", name: "Kit", price: 100, feePerKit: 3 }]);
  };
  const products = await fetchGroupOrderProducts("7M9AL", controller.signal);
  assert.equal(products[0].price, 100);
  assert.equal(products[0].feePerKit, 3);
});

test("accepts explicit zero kit fees", async () => {
  globalThis.fetch = async () => Response.json([{ id: "p", feePerKit: 0 }]);
  assert.equal((await fetchGroupOrderProducts("G"))[0].feePerKit, 0);
});

test("fails explicitly instead of quoting zero when prices cannot be loaded", async () => {
  globalThis.fetch = async () => new Response("Forbidden", { status: 403 });
  await assert.rejects(fetchGroupOrderProducts("G"), /Could not load product prices and kit fees/);
});

test("rejects missing and invalid kit-fee data rather than silently omitting charges", async () => {
  for (const data of [{}, [{ id: "p" }], [{ id: "p", feePerKit: -3 }], [{ id: "p", feePerKit: "3" }]]) {
    globalThis.fetch = async () => Response.json(data);
    await assert.rejects(fetchGroupOrderProducts("G"), /Could not load current kit fees/);
  }
});
