import { describe, expect, it } from "vitest";
import { followSourceOrders } from "./vendor-portal-model";

const parcels = (order: { trackingPackages?: unknown[] }) => (order.trackingPackages ?? []) as never[];
const row = (status: string, extra: object = {}) => ({ status, trackingNumber: null, carrier: null, trackingPackages: [], ...extra });
const parcel = { id: "p1", courier: "Royal Mail", internationalTrackingNumber: "QP123GB", localTrackingNumber: null };

describe("vendor shipment follows its Salt&Peps order", () => {
  it("shows Processing when staff moved the order on", () => {
    expect(followSourceOrders(row("Submitted"), [{ status: "Processing" }], parcels).status).toBe("Processing");
  });
  it("shows Shipped with the order's tracking when staff shipped it in the main admin", () => {
    const shown = followSourceOrders(row("Submitted"), [{ status: "Shipped", shippingCarrier: "Royal Mail", trackingPackages: [parcel] } as never], parcels);
    expect(shown).toMatchObject({ status: "Shipped", trackingNumber: "QP123GB", carrier: "Royal Mail", trackingPackages: [parcel] });
  });
  it("shows Completed for completed orders and Cancelled when every order is cancelled", () => {
    expect(followSourceOrders(row("Shipped"), [{ status: "Completed" }], parcels).status).toBe("Completed");
    expect(followSourceOrders(row("Submitted"), [{ status: "Cancelled" }], parcels).status).toBe("Cancelled");
  });
  it("never moves a shipment backwards and keeps the vendor's own tracking", () => {
    const own = row("Shipped", { trackingNumber: "VENDOR1", carrier: "DHL", trackingPackages: [{ ...parcel, internationalTrackingNumber: "VENDOR1", courier: "DHL" }] });
    const shown = followSourceOrders(own, [{ status: "Submitted", trackingPackages: [parcel] } as never], parcels);
    expect(shown).toBe(own);
  });
  it("waits for every order in a shared shipment and ignores cancelled members", () => {
    expect(followSourceOrders(row("Submitted"), [{ status: "Shipped" }, { status: "Processing" }], parcels).status).toBe("Processing");
    expect(followSourceOrders(row("Submitted"), [{ status: "Shipped" }, { status: "Cancelled" }], parcels).status).toBe("Shipped");
  });
  it("does not borrow tracking when the orders are split between vendors, and leaves unknown states alone", () => {
    const shown = followSourceOrders(row("Submitted"), [{ status: "Shipped", trackingPackages: [parcel] } as never], parcels, false);
    expect(shown).toMatchObject({ status: "Shipped", trackingNumber: null });
    const draft = row("Submitted");
    expect(followSourceOrders(draft, [{ status: "Draft" }], parcels)).toBe(draft);
    expect(followSourceOrders(draft, [], parcels)).toBe(draft);
  });
});
