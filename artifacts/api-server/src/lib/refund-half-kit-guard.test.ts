import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", async () => await import("../../../../lib/db/src/schema"));
import { assertRefundBeforeVendor } from "./refund-supplier-batches";
import { getTableName } from "drizzle-orm";

function transaction(activeClaim: boolean) {
  const reads: string[] = [];
  const tx = {
    select: () => ({
      from: (table: any) => {
        const name = getTableName(table);
        reads.push(name);
        const result = name === "gb_half_kit_claims" && activeClaim ? [{ id: "claim-1" }] : [];
        const query: any = {
          where: () => query, orderBy: () => query, for: () => query, limit: () => query,
          then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        };
        return query;
      },
    }),
  };
  return { tx, reads };
}

describe("transactional refund half-kit protection", () => {
  it("rejects outstanding half-kit balances under the refund transaction", async () => {
    const { tx } = transaction(true);
    await expect(assertRefundBeforeVendor(tx, {
      id: "o1", groupBuyId: "g1", paymentStatus: "confirmed", amountDue: "10",
    })).rejects.toMatchObject({ code: "unpaid_half_kit_claims" });
  });
  it("allows fully paid claimed halves", async () => {
    const { tx } = transaction(true);
    await expect(assertRefundBeforeVendor(tx, {
      id: "o1", groupBuyId: "g1", paymentStatus: "confirmed", amountDue: "0",
    })).resolves.toEqual([]);
  });
  it("does not treat an unrelated balance as an unpaid half-kit claim", async () => {
    const { tx } = transaction(false);
    await expect(assertRefundBeforeVendor(tx, {
      id: "o1", groupBuyId: "g1", paymentStatus: "confirmed", amountDue: "10",
    })).resolves.toEqual([]);
  });
});
