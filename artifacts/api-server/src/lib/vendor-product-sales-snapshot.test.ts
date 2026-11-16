import { expect, it } from "vitest";
import { snapshotProductSales } from "./vendor-payment-profit";

it("freezes member-specific sales alongside supplier aggregates at submission", () => {
  const items = [
    { productName: "A", quantity: 0.5, lineTotal: "20.00" },
    { productName: "A", quantity: 1.5, lineTotal: "80.00" },
  ];
  const identities = [{ orderId: "o1", vendorId: "v1" }, { orderId: "o2", vendorId: "v1" }];
  expect(snapshotProductSales(items, identities)).toEqual({
    currency: "USD", salesUsd: "100.00", lines: [{ productName: "A", quantity: 2, salesUsd: "100.00" }],
    orderLines: [
      { orderId: "o1", vendorId: "v1", productName: "A", quantity: 0.5, salesUsd: "20.00" },
      { orderId: "o2", vendorId: "v1", productName: "A", quantity: 1.5, salesUsd: "80.00" },
    ],
  });
});
it("groups exact same-member/product lines without dropping the member identity", () => {
  const items = [{ productName: "A", quantity: 0.5, lineTotal: "20.00" }, { productName: "A", quantity: 1, lineTotal: "40.00" }];
  expect(snapshotProductSales(items, [{ orderId: "o1", vendorId: "v1" }, { orderId: "o1", vendorId: "v1" }]).orderLines)
    .toEqual([{ orderId: "o1", vendorId: "v1", productName: "A", quantity: 1.5, salesUsd: "60.00" }]);
  expect(() => snapshotProductSales(items, [{ orderId: "o1", vendorId: "v1" }])).toThrow();
});
