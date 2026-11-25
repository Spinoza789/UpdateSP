import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the actual editor save handler without importing the entire dashboard
// (and all its unrelated page/session side effects) into a unit test.
const source = readFileSync(new URL("./GbOrganiser.tsx", import.meta.url), "utf8");
const start = source.indexOf("  const saveEdit = async (o: OrgOrder)");
const end = source.indexOf("\n  const sendMsg =", start);
if (start < 0 || end < start) throw new Error("Organiser editor save handler not found");
const javascript = ts.transpileModule(`${source.slice(start, end)}\nreturn saveEdit;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

type Line = { id?: string; productId?: string; quantity: number };
async function save({ original, edited = original, locked = false, canEditQuantities = true }: {
  original: Line[]; edited?: Line[]; locked?: boolean; canEditQuantities?: boolean;
}) {
  const order = {
    id: "order-1", status: "Processing", paymentStatus: "confirmed",
    adminNotes: null, trackingNumbers: null, paymentTxHashes: null,
    grandTotal: 125, productSubtotal: 120, lineItems: original,
  };
  const edit = {
    ...order, status: "Shipped", adminNotes: "", trackingNumbers: [],
    paymentTxHashes: [], lineItems: edited,
  };
  let savedOrders = [order];
  let errors: Record<string, string> = {};
  const closeEdit = vi.fn();
  const fetch = vi.fn(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);
    if (locked && body.lineItems !== undefined) {
      return { ok: false, json: async () => ({
        error: "This order belongs to supplier batch GB-001. It has already been ordered from the supplier. Contact Admin to resolve the exception; do not change the purchased items.",
      }) };
    }
    return { ok: true, json: async () => ({ order: { ...order, status: body.status } }) };
  });
  const handler = new Function("edits", "gb", "fetch", "setSaving", "setSaveErr", "setOrders", "setSaveOk", "closeEdit", "setTimeout", javascript)(
    { [order.id]: edit }, { id: "gb-1", organiserCanEditQuantities: canEditQuantities }, fetch,
    () => {}, (update: (value: typeof errors) => typeof errors) => { errors = update(errors); },
    (update: (value: typeof savedOrders) => typeof savedOrders) => { savedOrders = update(savedOrders); },
    () => {}, closeEdit, () => {},
  );
  await handler(order);
  return {
    payload: JSON.parse(fetch.mock.calls[0][1].body as string),
    url: fetch.mock.calls[0][0], errors, savedOrders, closeEdit,
  };
}

describe("organiser marks an edited order shipped", () => {
  it("does not resend unchanged quantities or trigger the purchased-batch lock", async () => {
    const result = await save({ original: [{ id: "line-1", quantity: 1 }], locked: true });
    expect(result.errors["order-1"]).toBe("");
    expect(result.closeEdit).toHaveBeenCalledWith("order-1");
    expect(result.savedOrders[0].status).toBe("Shipped");
    expect(result.payload.status).toBe("Shipped");
    expect(result.payload).not.toHaveProperty("lineItems");
    expect(result.url).toBe("/api/organiser/group-buys/gb-1/orders/order-1");
  });

  it("does not treat reordered, unchanged lines as a product edit", async () => {
    const first = { id: "line-1", quantity: 0.5 }, second = { id: "line-2", quantity: 2 };
    const result = await save({ original: [first, second], edited: [second, first], locked: true });
    expect(result.errors["order-1"]).toBe("");
    expect(result.payload).not.toHaveProperty("lineItems");
  });

  it.each([
    { name: "quantity", edited: [{ id: "line-1", quantity: 2 }] },
    { name: "addition", edited: [{ id: "line-1", quantity: 1 }, { productId: "new-product", quantity: 1 }] },
    { name: "removal", edited: [] },
  ])("still sends a real $name change", async ({ edited }) => {
    const result = await save({ original: [{ id: "line-1", quantity: 1 }], edited });
    expect(result.payload.lineItems).toEqual(edited);
  });

  it("keeps real product edits blocked for an ordered supplier batch", async () => {
    const result = await save({
      original: [{ id: "line-1", quantity: 1 }], edited: [{ id: "line-1", quantity: 2 }], locked: true,
    });
    expect(result.errors["order-1"]).toContain("Contact Admin");
    expect(result.closeEdit).not.toHaveBeenCalled();
  });

  it("does not submit quantities without quantity-edit permission", async () => {
    const result = await save({
      original: [{ id: "line-1", quantity: 1 }], edited: [{ id: "line-1", quantity: 2 }],
      canEditQuantities: false, locked: true,
    });
    expect(result.payload).not.toHaveProperty("lineItems");
    expect(result.savedOrders[0].status).toBe("Shipped");
  });
});
