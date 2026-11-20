import assert from "node:assert/strict";
import test from "node:test";
import { groupBuyCapacityFill } from "./group-buy-capacity";

test("unlimited products stay available after orders have been placed", () => {
  assert.deepEqual(groupBuyCapacityFill({ stock: 0, totalOrdered: 5, unlimited: true, status: "available" }, 2), {
    othersFillPct: 0, myFillPct: 0, liveStatus: "available",
  });
});
test("unlimited stock cannot fill up even with a large draft quantity", () => {
  assert.equal(groupBuyCapacityFill({ stock: 0, totalOrdered: 0, unlimited: true, status: "available" }, 10000).liveStatus, "available");
});
test("finite stock keeps the existing live fullness thresholds", () => {
  assert.deepEqual(groupBuyCapacityFill({ stock: 100, totalOrdered: 60, status: "limited" }, 20), {
    othersFillPct: 60, myFillPct: 20, liveStatus: "low",
  });
  assert.equal(groupBuyCapacityFill({ stock: 100, totalOrdered: 90, status: "low" }, 5).liveStatus, "full");
});
test("explicit zero stock remains unavailable, not unlimited", () => {
  assert.equal(groupBuyCapacityFill({ stock: 0, totalOrdered: 0, status: "full", unlimited: false }, 0).liveStatus, "full");
});
