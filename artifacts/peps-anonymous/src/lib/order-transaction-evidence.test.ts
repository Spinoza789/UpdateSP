import { describe, expect, it } from "vitest";
import { orderTransactionReferences, transactionChain, transactionExplorer } from "./order-transaction-evidence";
const hash = `0x${"a".repeat(64)}`, signature = `${"3".repeat(87)}A`;
describe("organiser transaction references and explorer links", () => {
  it.each(["ETH", "Ethereum", "ERC-20", "Ethereum (ERC20)"])("links %s payments to Etherscan", network => {
    expect(transactionExplorer(hash, network)).toBe(`https://etherscan.io/tx/${hash}`);
  });
  it.each(["SOL", "Solana", "SPL"])("links %s payments to Solscan", network => {
    expect(transactionExplorer(signature, network)).toBe(`https://solscan.io/tx/${signature}`);
  });
  it.each(["fiat:bank_transfer", "anonpay:reference", "javascript:alert(1)", "https://evil.test", "not-a-hash"])("never makes an explorer link for %s", txid => {
    expect(transactionExplorer(txid)).toBeNull();
  });
  it("respects recorded networks instead of treating every EVM hash as Ethereum", () => {
    expect(transactionChain(hash, "BSC")).toBeNull();
    expect(transactionChain(hash, "Solana")).toBeNull();
    expect(transactionChain(signature, "Ethereum")).toBeNull();
  });
  it("shows primary, additional, test and balance references without duplicate Ethereum hashes", () => {
    const second = `0x${"b".repeat(64)}`, test = `0x${"c".repeat(64)}`;
    expect(orderTransactionReferences({
      testPaymentTxHash: test, paymentTxHash: hash, paymentTxHashes: [hash.toUpperCase(), second],
      balanceTxHash: signature, paymentCryptoNetwork: "Ethereum",
    }).map(reference => reference.txid)).toEqual([test, hash, second, signature]);
  });
  it("does not deduplicate distinct, case-sensitive Solana signatures", () => {
    expect(orderTransactionReferences({ paymentTxHashes: [signature, signature.toLowerCase()] })).toHaveLength(2);
  });
});
