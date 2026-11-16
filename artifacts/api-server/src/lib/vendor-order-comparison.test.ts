import { describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", async () => ({ ...(await import("../../../../lib/db/src/schema/index")), db: {} }));
import { buildOrderComparison, vendorOrderComparison } from "./vendor-order-comparison";

const current = { from: "2026-11-09", to: "2026-11-15" };
const previous = { from: "2026-11-02", to: "2026-11-08" };
describe("supplier order comparisons", () => {
  it("counts submissions rather than members, fills zero days and compares periods", () => {
    const report = buildOrderComparison([
      { date: "2026-11-09", count: "30", excluded: "2" },
      { date: "2026-11-10", count: "5", excluded: "0" },
      { date: "2026-11-02", count: "20", excluded: "1" },
    ], current, previous, "uther");
    expect(report.current).toMatchObject({ total: 35, excluded: 2 });
    expect(report.current.daily).toHaveLength(7);
    expect(report.current.daily[6]).toEqual({ date: "2026-11-15", count: 0 });
    expect(report.previous.total).toBe(20);
    expect(report).toMatchObject({ difference: 15, percentChange: "75.00", vendorId: "uther", timeZone: "Europe/London" });
  });
  it("handles zero baselines and declines without Infinity", () => {
    const empty = buildOrderComparison([], current, previous);
    expect(empty).toMatchObject({ difference: 0, percentChange: null });
    expect(buildOrderComparison([{ date: current.from, count: "1", excluded: "0" }], current, previous))
      .toMatchObject({ difference: 1, percentChange: null });
    expect(buildOrderComparison([{ date: previous.from, count: "4", excluded: "0" }], current, previous))
      .toMatchObject({ difference: -4, percentChange: "-100.00" });
  });
  it("validates both ranges before querying and rejects malformed aggregate counts", async () => {
    const tx = { execute: vi.fn() };
    await expect(vendorOrderComparison(tx, undefined, current.from, current.to, "2026-02-30", previous.to)).rejects.toThrow(/valid/);
    await expect(vendorOrderComparison(tx, undefined, current.to, current.from, previous.from, previous.to)).rejects.toThrow(/ordered/);
    await expect(vendorOrderComparison(tx, undefined, "2000-01-01", "2026-01-01", previous.from, previous.to)).rejects.toThrow(/ten years/);
    expect(tx.execute).not.toHaveBeenCalled();
    expect(() => buildOrderComparison([{ date: current.from, count: "-1", excluded: "0" }], current, previous)).toThrow();
  });
});
