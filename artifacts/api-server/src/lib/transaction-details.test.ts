import { describe, expect, it, vi } from "vitest";
import { createTransactionLookup } from "./transaction-details";
import { ETH_USDT_CONTRACT, TRANSFER_TOPIC, SOL_USDC_MINT } from "./payment-verify";

const hash = `0x${"a".repeat(64)}`, wallet = `0x${"b".repeat(40)}`;
const signature = "3".repeat(88);
const tokenLog = (raw: string) => ({ address: ETH_USDT_CONTRACT, topics: [TRANSFER_TOPIC, `0x${"0".repeat(64)}`, `0x${"0".repeat(24)}${wallet.slice(2)}`], data: `0x${BigInt(raw).toString(16)}` });

describe("read-only payment transaction details", () => {
  it("decodes actual ERC20 receipts rather than the transaction ETH value", async () => {
    const rpc = vi.fn(async (_endpoints, method) => method === "eth_getTransactionReceipt"
      ? { status: "0x1", logs: [tokenLog("1550000000")] }
      : { to: ETH_USDT_CONTRACT, value: "0x0" });
    const result = await createTransactionLookup({ rpc })("ERC-20", hash);
    expect(result.status).toBe("confirmed");
    expect(result.transfers).toEqual([{ recipient: wallet, amount: "1550", currency: "USDT", recipientType: "wallet" }]);
  });
  it("keeps native ETH precision and lists multiple recipients separately", async () => {
    const rpc = vi.fn(async (_endpoints, method) => method === "eth_getTransactionReceipt"
      ? { status: "0x1", logs: [tokenLog("1000000"), { ...tokenLog("2000000"), topics: [TRANSFER_TOPIC, "0x0", `0x${"c".repeat(64)}`] }] }
      : { to: wallet, value: "0xde0b6b3a7640001" });
    const result = await createTransactionLookup({ rpc })("Ethereum", hash);
    expect(result.transfers).toHaveLength(3);
    expect(result.transfers[0]).toMatchObject({ amount: "1.000000000000000001", currency: "ETH" });
  });
  it("never reports transfers as received for failed or pending transactions", async () => {
    const failed = await createTransactionLookup({ rpc: async () => ({ status: "0x0", logs: [tokenLog("1000000")] }) })("Ethereum", hash);
    expect(failed).toMatchObject({ status: "failed", transfers: [] });
    const pending = await createTransactionLookup({ rpc: async () => null })("Ethereum", hash);
    expect(pending).toMatchObject({ status: "pending", transfers: [] });
  });
  it("resolves Solana token destinations to their owner wallet and excludes gas from native transfers", async () => {
    const rpc = vi.fn(async () => ({
      meta: { err: null, preTokenBalances: [], postTokenBalances: [
        { accountIndex: 1, mint: SOL_USDC_MINT, owner: "ReceiverWallet", uiTokenAmount: { decimals: 6 } },
      ], innerInstructions: [{ instructions: [{ program: "spl-token", parsed: { type: "transfer", info: { destination: "TokenAccount", amount: "415000000" } } }] }] },
      transaction: { message: { accountKeys: [{ pubkey: "Sender" }, { pubkey: "TokenAccount" }], instructions: [
        { program: "system", parsed: { type: "transfer", info: { destination: "NativeWallet", lamports: 2000000000 } } },
      ] } },
    }));
    const result = await createTransactionLookup({ rpc })("Solana", signature);
    expect(rpc).toHaveBeenCalledWith(expect.any(Array), "getTransaction", [
      signature, expect.objectContaining({ encoding: "jsonParsed", maxSupportedTransactionVersion: 1 }),
    ]);
    expect(result.transfers).toEqual([
      { recipient: "NativeWallet", amount: "2", currency: "SOL", recipientType: "wallet" },
      { recipient: "ReceiverWallet", amount: "415", currency: "USDC", recipientType: "wallet" },
    ]);
  });
  it("labels unresolved token accounts honestly, ignores unknown tokens and failed Solana instructions", async () => {
    const result = await createTransactionLookup({ rpc: async () => ({
      meta: { err: null, innerInstructions: [] },
      transaction: { message: { instructions: [{ program: "spl-token", parsed: { type: "transferChecked",
        info: { destination: "TokenAccount", mint: SOL_USDC_MINT, tokenAmount: { amount: "1234567", decimals: 6 } } } }] } },
    }) })("Solana", signature);
    expect(result.transfers[0]).toMatchObject({ recipientType: "token_account", amount: "1.234567" });
    const failed = await createTransactionLookup({ rpc: async () => ({ meta: { err: { failure: true } } }) })("Solana", signature);
    expect(failed).toMatchObject({ status: "failed", transfers: [] });
  });
  it("coalesces requests, caches successful reads, and retries cached provider failures after a short TTL", async () => {
    let now = 0;
    const rpc = vi.fn(async () => { throw new Error("provider down"); });
    const lookup = createTransactionLookup({ rpc, now: () => now });
    expect((await lookup("Solana", signature)).status).toBe("unavailable");
    await lookup("Solana", signature);
    expect(rpc).toHaveBeenCalledTimes(1);
    now = 16000;
    await Promise.all([lookup("Solana", signature), lookup("SOL", signature)]);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("rejects unsupported networks and invalid hashes before making any RPC request", async () => {
    const rpc = vi.fn();
    const lookup = createTransactionLookup({ rpc });
    await expect(lookup("BSC", hash)).rejects.toThrow(/supported/i);
    await expect(lookup("Ethereum", "https://evil.test")).rejects.toThrow(/TXID/i);
    expect(rpc).not.toHaveBeenCalled();
  });
});
