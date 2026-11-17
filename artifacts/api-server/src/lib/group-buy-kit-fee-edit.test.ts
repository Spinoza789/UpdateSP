import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateGroupKitFees, kitFeeEditLocked } from "./group-buy-kit-fees";

describe("group-buy kit fees in customer edits", () => {
  it("charges the edited quantities at their group-product rates, including half kits", () => {
    const rates = [
      { productId: "a", feePerKit: "3.00" },
      { productId: "b", feePerKit: "2.75" },
    ];
    expect(calculateGroupKitFees([{ productId: "a", quantity: 2 }], rates)).toBe(6);
    expect(calculateGroupKitFees([
      { productId: "a", quantity: "4" },
      { productId: "b", quantity: "0.5" },
      { productId: "c", quantity: 1 },
    ], rates)).toBe(13.38);
  });

  it("does not reprice a fee-bearing order while payments or separate balances exist", () => {
    const order = { paymentStatus: "unpaid", kitFees: "3.00" };
    expect(kitFeeEditLocked(order, 6)).toBe(false);
    for (const payment of [
      { paymentStatus: "confirmed" },
      { paymentStatus: "test_confirmed" },
      { paymentStatus: "pending_confirmation" },
      { amountDue: "3.00" },
      { balancePaymentStatus: "confirmed" },
      { paymentTxHash: "proof" },
    ]) {
      expect(kitFeeEditLocked({ ...order, ...payment }, 6)).toBe(true);
    }
    expect(kitFeeEditLocked({ paymentStatus: "confirmed", kitFees: "0" }, 0)).toBe(false);
  });

  it("writes the fee and includes it in the customer edit total under the transaction lock", () => {
    const source = readFileSync(new URL("../routes/orders.ts", import.meta.url), "utf8");
    const edit = source.slice(source.indexOf('router.put("/orders/:orderId"'), source.indexOf('router.post("/orders/:orderId/shipping-address"'));
    expect(edit).toMatch(/assertGroupStock\(tx,[\s\S]*for\("update"\)[\s\S]*resolvedKitFees = calculateGroupKitFees/);
    expect(edit).toContain("baseUpdateTotal + resolvedAdminFee + resolvedKitFees");
    expect(edit).toContain("kitFees: resolvedKitFees.toFixed(2)");
    expect(edit).toMatch(/!clientDirectShippingRequested && !isAddition/);
  });
});
