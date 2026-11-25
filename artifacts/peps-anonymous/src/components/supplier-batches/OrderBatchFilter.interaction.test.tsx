import type { Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the existing workspace test harness.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost/" });
function setupGlobals() {
  for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "CustomEvent", "Node", "sessionStorage"]) {
    vi.stubGlobal(name, name === "window" ? dom.window : dom.window[name]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupGlobals();
const { act, createElement: h, useEffect, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { supplierKey } = await import("@/lib/supplier-batches");
const {
  useOrderBatches, OrderBatchFilter, OrderDispatchFilter, matchesOrderDispatchStatus,
  visibleOrderSelection, selectSupplierOrderBatch,
} = await import("./OrderBatchFilter");

const rows = [
  { id: "a", status: "Processing" }, { id: "b", status: "Shipped" },
  { id: "c", status: "Delivered" }, { id: "open", status: "Submitted" },
  { id: "queued", status: "Processing" }, { id: "unassigned", status: "Submitted" },
];
const data = {
  config: { enabled: true },
  batches: [
    { id: "b1", reference: "GB-001", state: "ordered", exceptions: [], snapshot: { orders: [{ id: "a" }, { id: "b" }] } },
    { id: "b2", reference: "GB-002", state: "prepared", exceptions: [], snapshot: { orders: [{ id: "c" }] } },
  ],
  proposals: [{
    region: { id: "uk", name: "United Kingdom" }, orders: [{ id: "open" }],
    allQueued: { orders: [{ id: "open" }, { id: "queued" }] },
  }],
};

function Harness({ groupId = "G", orderRows = rows }: { groupId?: string; orderRows?: typeof rows }) {
  const model = useOrderBatches("organiser", groupId);
  const [dispatch, setDispatch] = useState<"all" | "awaiting" | "dispatched" | "delivered">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const visible = orderRows.filter(row => model.matches(row.id) && matchesOrderDispatchStatus(row.status, dispatch));
  useEffect(() => {
    setSelected(current => {
      const next = visibleOrderSelection(current, visible);
      return next.length === current.length ? current : next;
    });
  }, [visible]);
  useEffect(() => { setDispatch("all"); setSelected([]); }, [groupId]);
  return h("section", null,
    h(OrderBatchFilter, { model, alwaysVisible: true, includeOpenBatches: true,
      onChange: (value: string) => { model.setFilter(value); setSelected([]); } }),
    h(OrderDispatchFilter, { value: dispatch, onChange: value => { setDispatch(value); setSelected([]); } }),
    h("button", { type: "button", onClick: () => setSelected(visible.map(row => row.id)) }, "Select matching orders"),
    h("output", { "aria-label": "Matching orders" }, visible.map(row => row.id).join(",")),
    h("output", { "aria-label": "Selected orders" }, selected.join(",")),
    h("output", { "aria-label": "Total orders" }, orderRows.length),
  );
}

let container: HTMLDivElement, root: Root, client: InstanceType<typeof QueryClient>;
async function render(groupId = "G", orderRows = rows) {
  await act(async () => root.render(h(QueryClientProvider, { client }, h(Harness, { groupId, orderRows }))));
}
const text = (label: string) => container.querySelector(`[aria-label="${label}"]`)?.textContent;
async function choose(label: string, value: string) {
  await act(async () => {
    const select = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
beforeEach(() => {
  setupGlobals();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(supplierKey("organiser", "G"), data);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});
afterAll(() => dom.window.close());

describe("organiser batch and dispatch controls", () => {
  it("combines filters and selects only visible matching orders without changing headline totals", async () => {
    await render();
    await choose("Supplier batch filter", "b1");
    expect(text("Matching orders")).toBe("a,b");
    await choose("Dispatch status filter", "awaiting");
    expect(text("Matching orders")).toBe("a");
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(text("Selected orders")).toBe("a");
    await choose("Dispatch status filter", "dispatched");
    expect(text("Matching orders")).toBe("b");
    expect(text("Selected orders")).toBe("");
    await choose("Supplier batch filter", "b2");
    expect(text("Matching orders")).toBe("");
    await choose("Dispatch status filter", "delivered");
    expect(text("Matching orders")).toBe("c");
    expect(text("Total orders")).toBe("6");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("filters open and queued orders and restores the saved batch on remount", async () => {
    await render();
    await choose("Supplier batch filter", "open:uk:1");
    expect(text("Matching orders")).toBe("open");
    await choose("Supplier batch filter", "queued");
    expect(text("Matching orders")).toBe("queued");
    await act(async () => root.unmount());
    root = createRoot(container);
    await render();
    expect(text("Matching orders")).toBe("queued");
    expect(container.querySelector<HTMLSelectElement>('select[aria-label="Supplier batch filter"]')!.value).toBe("queued");
    await choose("Supplier batch filter", "unallocated");
    expect(text("Matching orders")).toBe("open,queued,unassigned");
  });

  it("keeps each group buy's saved batch separate when switching groups", async () => {
    await render();
    await choose("Supplier batch filter", "b1");
    client.setQueryData(supplierKey("organiser", "H"), {
      ...data, proposals: [], batches: [{ ...data.batches[0], id: "h1", snapshot: { orders: [{ id: "other" }] } }],
    });
    sessionStorage.setItem("supplier-order-filter:organiser:H", "h1");
    await render("H", [{ id: "other", status: "Processing" }]);
    expect(text("Matching orders")).toBe("other");
    expect(container.querySelector<HTMLSelectElement>("select")!.value).toBe("h1");
    await render();
    expect(text("Matching orders")).toBe("a,b");
    expect(container.querySelector<HTMLSelectElement>("select")!.value).toBe("b1");
  });

  it("clears a linked single-order restriction when showing the whole batch", async () => {
    await render();
    await act(async () => selectSupplierOrderBatch("organiser", "G", "b1", "b"));
    expect(text("Matching orders")).toBe("b");
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes("Show whole batch"))!.click();
    });
    expect(text("Matching orders")).toBe("a,b");
    expect(sessionStorage.getItem("supplier-order-filter:organiser:G:order")).toBeNull();
  });

  it("drops selections when orders are moved out of the selected batch", async () => {
    await render();
    await choose("Supplier batch filter", "b1");
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(text("Selected orders")).toBe("a,b");
    await act(async () => {
      client.setQueryData(supplierKey("organiser", "G"), {
        ...data, batches: [{ ...data.batches[0], snapshot: { orders: [{ id: "a" }] } }, data.batches[1]],
      });
      // React Query batches observer notifications on the next timer turn.
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(text("Selected orders")).toBe("a");
    expect(text("Matching orders")).toBe("a");
  });

  it("keeps an empty queued filter visible instead of appearing to show all orders", async () => {
    await render();
    await choose("Supplier batch filter", "queued");
    await act(async () => {
      client.setQueryData(supplierKey("organiser", "G"), { ...data, proposals: [] });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(text("Matching orders")).toBe("");
    expect(container.querySelector<HTMLSelectElement>("select")!.value).toBe("queued");
  });

  it("shows an error without exposing unrelated orders when the chosen batch cannot load", async () => {
    client.removeQueries({ queryKey: supplierKey("organiser", "G") });
    sessionStorage.setItem("supplier-order-filter:organiser:G", "b1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 403, json: async () => ({ error: "Not allowed" }),
    }));
    await render();
    await vi.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("could not be refreshed");
    });
    expect(text("Matching orders")).toBe("");
    expect(container.querySelector<HTMLSelectElement>("select")!.value).toBe("b1");
    expect(fetch).toHaveBeenCalledWith("/api/organiser/group-buys/G/supplier-batches",
      expect.objectContaining({ credentials: "include", method: "GET" }));
  });
});
