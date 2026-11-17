import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderTransactions } from "./OrderTransactions";

describe("order transaction links", () => {
  it("separates buyer and supplier TXIDs with network-specific safe links", () => {
    const eth = `0x${"a".repeat(64)}`, sol = "3".repeat(88);
    const html = renderToStaticMarkup(<OrderTransactions
      order={{ buyerTransactions: [{ orderId: "one", reference: "12957", kind: "Payment", txid: eth, network: "ERC-20", currency: "USDT" }] } as any}
      receipt={{ txid: sol, network: "Solana", currency: "USDC", voidedAt: null } as any} />);
    expect(html).toContain("Buyer payments");
    expect(html).toContain("Supplier payment");
    expect(html).toContain(`https://etherscan.io/tx/${eth}`);
    expect(html).toContain(`https://solscan.io/tx/${sol}`);
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("does not guess Ethereum from a hash or link unsupported networks", () => {
    const html = renderToStaticMarkup(<OrderTransactions order={{ buyerTransactions: [
      { orderId: "one", reference: "1", kind: "Payment", txid: `0x${"b".repeat(64)}`, network: "BSC", currency: "USDT" },
    ] } as any} receipt={null} />);
    expect(html).not.toContain('href=');
    expect(html).toContain("No supplier payment TXID recorded");
  });
  it("shows empty states and excludes voided supplier receipts", () => {
    const html = renderToStaticMarkup(<OrderTransactions order={{} as any} receipt={{ voidedAt: "today", txid: "old", network: "Ethereum" } as any} />);
    expect(html).toContain("No buyer payment TXID recorded");
    expect(html).toContain("No supplier payment TXID recorded");
    expect(html).not.toContain("etherscan");
  });
});
