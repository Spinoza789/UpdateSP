import { describe, expect, it } from "vitest";
import { regionalQueueProposals, snapshotOrder } from "./supplier-batches-model";

const region = { id: "uk", name: "United Kingdom", countries: ["GB"], targetKits: 25, hardLimitKits: 25 };
const queue = (sizes: number[]) => sizes.map((kits, i) => snapshotOrder({
  id: String(i).padStart(3, "0"), code: String(i), telegramUsername: "member", shippingCountry: "GB",
  paymentConfirmedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  lineItems: [{ productId: "p", productName: "Product", quantity: kits, unitPrice: "10", lineTotal: String(kits * 10) }],
}));

describe("Uther November full-batch filling", () => {
  it("keeps 19/25 open and places an eight-kit order in the next open batch", () => {
    const result = regionalQueueProposals("5ZZ87", queue([19, 8]), region);
    expect(result.map(p => [p.kits, p.ready])).toEqual([[19, false], [8, false]]);
    expect(result.map(p => p.openBatchNumber)).toEqual([1, 2]);
  });
  it("fills the oldest fitting batch with later orders without splitting or duplication", () => {
    const result = regionalQueueProposals("5ZZ87", queue([19, 8, 4, 2, 17]), region);
    expect(result.map(p => [p.kits, p.ready])).toEqual([[25, true], [25, true]]);
    expect(result[0].orders.map(o => o.code)).toEqual(["0", "2", "3"]);
    expect(result[1].orders.map(o => o.code)).toEqual(["1", "4"]);
    expect(new Set(result.flatMap(p => p.orders.map(o => o.id))).size).toBe(5);
  });
  it("handles half kits and leaves oversized orders blocked for staff review", () => {
    const result = regionalQueueProposals("5ZZ87", queue([26, 24.5, .5]), region);
    expect(result.map(p => [p.kits, p.ready])).toEqual([[25, true], [26, false]]);
    expect(result[1].oversizedOrder).toBe(true);
  });
  it("does not change another group's FIFO rule", () => {
    const result = regionalQueueProposals("another-group", queue([19, 8, 6]), region);
    expect(result).toHaveLength(1);
    expect(result[0].kits).toBe(19);
    expect(result[0].ready).toBe(false);
  });
  it("keeps an empty proposal and deterministic membership across repeated reads", () => {
    expect(regionalQueueProposals("5ZZ87", [], region)[0].kits).toBe(0);
    const input = queue([19, 8, 6]);
    expect(regionalQueueProposals("5ZZ87", input, region)).toEqual(regionalQueueProposals("5ZZ87", [...input].reverse(), region));
  });
});
