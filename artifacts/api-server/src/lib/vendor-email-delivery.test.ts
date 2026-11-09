import { describe, expect, it, vi } from "vitest";
import { deliverVendorEmails, emailEventAllowed } from "./vendor-email-delivery";

describe("vendor email delivery", () => {
  it("allows only new orders and messages, never other Telegram alerts", () => {
    expect(["new_order", "message"].map(emailEventAllowed)).toEqual([true, true]);
    for (const kind of ["hold", "overdue", "overdue_critical", "issue_resolved", "security", "announcement", "test"]) expect(emailEventAllowed(kind)).toBe(false);
  });
  it("uses stable provider idempotency and records success or retry without aborting other recipients", async () => {
    const queue = {
      enqueue: vi.fn(), pending: vi.fn(async () => [
        { notificationId: "n1", username: "a", recipient: "a@example.com", kind: "new_order", title: "Order #123", attempts: 0 },
        { notificationId: "n2", username: "b", recipient: "b@example.com", kind: "message", title: "New message", attempts: 0 },
      ]),
      eligible: vi.fn(async () => true), finish: vi.fn(), retry: vi.fn(), cancel: vi.fn(),
    };
    const send = vi.fn().mockRejectedValueOnce(new Error("unavailable")).mockResolvedValue({ ok: true });
    await deliverVendorEmails(queue, send);
    expect(queue.retry).toHaveBeenCalledTimes(1);
    expect(queue.finish).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe("vendor_new_order");
    expect(send.mock.calls[1][0]).toBe("vendor_message");
    expect(send.mock.calls[0][3].idempotencyKey).toMatch(/^vendor-email-/);
    const key = send.mock.calls[0][3].idempotencyKey;
    await deliverVendorEmails(queue, send);
    expect(send.mock.calls[2][3].idempotencyKey).toBe(key);
  });
  it("cancels queued mail when verification, opt-in or vendor assignment is no longer valid", async () => {
    const item = { notificationId: "n", username: "a", recipient: "a@example.com", kind: "message", title: "Message", attempts: 0 };
    const queue = { enqueue: vi.fn(), pending: vi.fn(async () => [item]), eligible: vi.fn(async () => false), finish: vi.fn(), retry: vi.fn(), cancel: vi.fn() };
    const send = vi.fn();
    await deliverVendorEmails(queue, send);
    expect(send).not.toHaveBeenCalled();
    expect(queue.cancel).toHaveBeenCalledWith(item);
  });
});
