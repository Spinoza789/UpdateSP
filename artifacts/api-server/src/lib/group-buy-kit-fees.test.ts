import { describe, expect, it, vi } from "vitest";
import { kitFeeAmount, updateGroupKitFees } from "./group-buy-kit-fees";

describe("bulk group-buy kit fees", () => {
  it.each(["", null, undefined, -1, "1abc", "NaN", Infinity, "1.001", true, 100000000])(
    "rejects invalid monetary input %s", value => {
      expect(() => kitFeeAmount(value)).toThrow();
    },
  );
  it.each([[0, "0.00"], ["2.50", "2.50"], [99999999.99, "99999999.99"]])(
    "accepts and normalises %s", (value, expected) => {
      expect(kitFeeAmount(value)).toBe(expected);
    },
  );
  it("validates every selected group link before any write", async () => {
    const tx = { execute: vi.fn().mockResolvedValue({ rows: [{ id: "p1" }] }) };
    await expect(updateGroupKitFees(tx as any, "G", ["p1", "foreign"], "2.00")).rejects.toThrow("not part");
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });
  it("updates only group product links and returns their saved fees", async () => {
    const tx = { execute: vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: "p1" }, { id: "p2" }] })
      .mockResolvedValueOnce({ rows: [{ id: "p1", feePerKit: "2.50" }, { id: "p2", feePerKit: "2.50" }] }) };
    expect(await updateGroupKitFees(tx as any, "G", ["p1", "p2"], "2.50")).toEqual([
      { id: "p1", feePerKit: 2.5 }, { id: "p2", feePerKit: 2.5 },
    ]);
    expect(tx.execute).toHaveBeenCalledTimes(2);
  });
  it("supports all products and detects concurrent link changes", async () => {
    const tx = { execute: vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] })
      .mockResolvedValueOnce({ rows: [] }) };
    await expect(updateGroupKitFees(tx as any, "G", "all", "0.00")).rejects.toThrow("changed");
  });
});
