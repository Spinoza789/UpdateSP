import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { postGroupBuyKitFees, GroupBuyBulkKitFeeControls } from "./GroupBuyBulkKitFeeControls";

afterEach(() => vi.unstubAllGlobals());
describe("bulk kit fee controls", () => {
  it.each(["", "-1", "1.001", "junk", "Infinity"])("rejects invalid fee %s without a request", async input => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(postGroupBuyKitFees("G", ["p"], input)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends a single selected-products request in the group currency", async () => {
    const saved = { products: [{ id: "p", feePerKit: 2.5 }], updatedCount: 1 };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => saved });
    vi.stubGlobal("fetch", fetcher);
    expect(await postGroupBuyKitFees("G", ["p"], "2.50")).toEqual(saved);
    expect(fetcher.mock.calls[0][0]).toBe("/api/organiser/group-buys/G/products/kit-fees");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ productIds: ["p"], feePerKit: "2.50" });
  });
  it("uses the Admin endpoint and credentials, including zero to remove fees", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [], updatedCount: 2 }) });
    vi.stubGlobal("fetch", fetcher);
    await postGroupBuyKitFees("G", ["p", "q"], "0", "admin-test");
    expect(fetcher.mock.calls[0][0]).toBe("/api/admin/group-buys/G/products/kit-fees");
    expect(fetcher.mock.calls[0][1].headers["x-admin-secret"]).toBe("admin-test");
  });
  it("surfaces rejection without claiming success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Not allowed" }) }));
    await expect(postGroupBuyKitFees("G", ["p"], "2")).rejects.toThrow("Not allowed");
  });
  it("explains set-not-increment and existing-order protection", () => {
    const html = renderToStaticMarkup(createElement(GroupBuyBulkKitFeeControls, {
      groupId: "G", currency: "GBP", selectedIds: new Set(["p"]), onUpdated: () => {},
    }));
    for (const text of ["Fee per kit", "GBP", "Set fee", "existing orders", "replaces"]) expect(html).toContain(text);
  });
});
