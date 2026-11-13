import { describe, expect, it } from "vitest";
import { accessFeeReview, parseAccessFee } from "./wholesale-access-fee-policy";

const untouched = {
  status: "pending", amountUsd: 50,
  testPaymentTxHash: null, paymentTxHash: null,
  paymentCryptoCurrency: null, paymentCryptoNetwork: null,
};

describe("wholesale access fee safeguard", () => {
  it("offers replacement for an untouched older higher quote", () => {
    expect(accessFeeReview(untouched, 5)).toEqual({
      outdatedHigherFee: true, canReplace: true, paymentStarted: false,
    });
  });
  it.each(["testPaymentTxHash", "paymentTxHash", "paymentCryptoCurrency", "paymentCryptoNetwork"])(
    "preserves the original terms once %s is recorded", field => {
      expect(accessFeeReview({ ...untouched, [field]: "recorded" }, 5)).toEqual({
        outdatedHigherFee: true, canReplace: false, paymentStarted: true,
      });
    },
  );
  it.each(["confirmed", "rejected", "replaced"])("never replaces a %s request", status => {
    expect(accessFeeReview({ ...untouched, status }, 5).canReplace).toBe(false);
  });
  it("never increases a cheaper old quote or changes the current quote", () => {
    expect(accessFeeReview({ ...untouched, amountUsd: 3 }, 5).outdatedHigherFee).toBe(false);
    expect(accessFeeReview({ ...untouched, amountUsd: 5 }, 5).canReplace).toBe(false);
  });
  it.each([null, "", "invalid", 0, -5, Infinity, 5.5])("rejects invalid configured pricing %s", value => {
    expect(parseAccessFee(value)).toBeNull();
  });
  it("uses the configured whole-dollar amount without inventing a fallback", () => {
    expect(parseAccessFee("5")).toBe(5);
    expect(parseAccessFee(10)).toBe(10);
    expect(accessFeeReview(untouched, null).canReplace).toBe(false);
  });
});
