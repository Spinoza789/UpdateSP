import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateOrderFormTotal, calculateOrderKitFees } from "./order-form-total";

const base = {
  lineTotals: [39, 40.5, 6],
  deliveryPrice: 3,
  vendorShipping: 0,
  tip: 0,
  testingContribution: 0,
  adminFee: 0,
  isTopUp: false,
};

test("includes all selected products and delivery", () => {
  assert.equal(calculateOrderFormTotal(base), 88.5);
});
test("responds to quantity changes and includes all known additional charges", () => {
  assert.equal(calculateOrderFormTotal({
    ...base, lineTotals: [78, 40.5, 6], vendorShipping: 12, tip: 5, testingContribution: 15, adminFee: 8,
  }), 167.5);
});
test("top-ups exclude delivery, vendor shipping and admin fee", () => {
  assert.equal(calculateOrderFormTotal({
    ...base, vendorShipping: 12, adminFee: 8, tip: 5, testingContribution: 15, isTopUp: true,
  }), 105.5);
});
test("rounds to currency precision and handles an empty order", () => {
  assert.equal(calculateOrderFormTotal({ ...base, lineTotals: [0.1, 0.2], deliveryPrice: 0 }), 0.3);
  assert.equal(calculateOrderFormTotal({ ...base, lineTotals: [], deliveryPrice: 0 }), 0);
});

test("includes kit fees separately from products and admin fees", () => {
  assert.equal(calculateOrderFormTotal({ ...base, kitFees: 6, adminFee: 5 }), 99.5);
});

test("top-ups do not charge kit fees", () => {
  assert.equal(calculateOrderFormTotal({ ...base, kitFees: 6, isTopUp: true }), 85.5);
});

const feeInput = {
  groupBuyId: "7M9AL", orderType: null, additionOfOrderId: null,
  directShippingRequested: false, halfKitCheckout: null,
  lineItems: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 0.5 }],
};
const rates = [{ id: "p1", feePerKit: 3 }, { id: "p2", feePerKit: 5 }];

test("full half-kit fees match server rounding without affecting other products", () => {
  const fullRates = [{ id: "p1", feePerKit: 3, chargeFullFeeOnHalfKit: true }, ...rates.slice(1)];
  for (const [quantity, expected] of [[0, 0], [0.5, 3], [1, 3], [1.5, 6], [2, 6]]) {
    assert.equal(calculateOrderKitFees({
      ...feeInput, lineItems: [{ productId: "p1", quantity }],
    }, fullRates), expected);
  }
  assert.equal(calculateOrderKitFees({
    ...feeInput, lineItems: [{ productId: "p1", quantity: 0.5 }, { productId: "p1", quantity: 0.5 }],
  }, fullRates), 3);
  assert.equal(calculateOrderKitFees({
    ...feeInput, lineItems: [{ productId: "p1", quantity: 0.5 }, { productId: "p2", quantity: 0.5 }],
  }, fullRates), 5.5);
});

test("kit fees follow each selected product rate and fractional quantity", () => {
  assert.equal(calculateOrderKitFees(feeInput, rates), 8.5);
  assert.equal(calculateOrderKitFees({ ...feeInput, lineItems: [{ productId: "p1", quantity: 3 }] }, rates), 9);
  assert.equal(calculateOrderKitFees({ ...feeInput, lineItems: [{ productId: null, quantity: 1 }] }, rates), 0);
});

test("kit-fee exemptions match the server for direct delivery, additions, wholesale and half-kit offers", () => {
  for (const override of [
    { groupBuyId: null }, { orderType: "wholesale" }, { additionOfOrderId: "parent" },
    { directShippingRequested: true }, { halfKitCheckout: {} },
  ]) {
    assert.equal(calculateOrderKitFees({ ...feeInput, ...override }, rates), 0);
  }
});

test("kit-fee rounding matches the server's cents calculation", () => {
  assert.equal(calculateOrderKitFees({
    ...feeInput, lineItems: [{ productId: "p1", quantity: 0.5 }],
  }, [{ id: "p1", feePerKit: 0.03 }]), 0.02);
});
