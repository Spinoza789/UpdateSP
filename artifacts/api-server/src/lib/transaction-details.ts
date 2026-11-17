import {
  evmJsonRpc, ETH_RPC_ENDPOINTS, SOL_RPC_ENDPOINTS, ETH_USDT_CONTRACT, ETH_USDC_CONTRACT,
  SOL_USDT_MINT, SOL_USDC_MINT, TRANSFER_TOPIC,
} from "./payment-verify";

export type ChainTransfer = { recipient: string; amount: string; currency: string; recipientType: "wallet" | "token_account" };
export type TransactionDetails = {
  status: "confirmed" | "failed" | "pending" | "unavailable";
  transfers: ChainTransfer[];
  checkedAt: string;
  message?: string;
};
type Rpc = (endpoints: string[], method: string, params: unknown[]) => Promise<unknown>;

function exactAmount(raw: string | number, decimals: number): string {
  if (typeof raw === "number" && !Number.isSafeInteger(raw)) throw new Error("Imprecise chain amount");
  const value = BigInt(raw);
  if (value < 0n) throw new Error("Negative transfer");
  const digits = value.toString().padStart(decimals + 1, "0");
  return decimals ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`.replace(/\.?0+$/, "") : digits;
}

async function ethereum(txid: string, rpc: Rpc) {
  const receipt: any = await rpc(ETH_RPC_ENDPOINTS.slice(0, 3), "eth_getTransactionReceipt", [txid]);
  if (!receipt) return { status: "pending" as const, transfers: [] };
  if (receipt.status === "0x0") return { status: "failed" as const, transfers: [] };
  if (receipt.status !== "0x1" || !Array.isArray(receipt.logs)) throw new Error("Incomplete Ethereum receipt");
  const tx: any = await rpc(ETH_RPC_ENDPOINTS.slice(0, 3), "eth_getTransactionByHash", [txid]);
  if (!tx) throw new Error("Ethereum transaction unavailable");
  const transfers: ChainTransfer[] = [];
  if (/^0x[0-9a-f]{40}$/i.test(tx.to ?? "") && BigInt(tx.value ?? "0x0") > 0n) {
    transfers.push({ recipient: tx.to, amount: exactAmount(tx.value, 18), currency: "ETH", recipientType: "wallet" });
  }
  for (const log of receipt.logs) {
    if (log.removed || log.topics?.[0]?.toLowerCase() !== TRANSFER_TOPIC
      || !/^0x[0-9a-f]{64}$/i.test(log.topics?.[2] ?? "") || !/^0x[0-9a-f]{1,64}$/i.test(log.data ?? "")) continue;
    const contract = String(log.address).toLowerCase();
    const currency = contract === ETH_USDT_CONTRACT ? "USDT" : contract === ETH_USDC_CONTRACT ? "USDC" : null;
    if (!currency || BigInt(log.data) === 0n) continue;
    transfers.push({ recipient: `0x${log.topics[2].slice(-40)}`.toLowerCase(), amount: exactAmount(log.data, 6), currency, recipientType: "wallet" });
  }
  return { status: "confirmed" as const, transfers };
}

async function solana(txid: string, rpc: Rpc) {
  const tx: any = await rpc(SOL_RPC_ENDPOINTS, "getTransaction", [txid, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 1 }]);
  if (!tx) return { status: "pending" as const, transfers: [] };
  if (!tx.meta || !Object.prototype.hasOwnProperty.call(tx.meta, "err")) throw new Error("Incomplete Solana metadata");
  if (tx.meta.err !== null) return { status: "failed" as const, transfers: [] };
  const message = tx.transaction?.message;
  if (!Array.isArray(message?.instructions)) throw new Error("Incomplete Solana transaction");
  const accounts = new Map<string, { mint: string; owner?: string }>();
  for (const balance of [...(tx.meta.preTokenBalances ?? []), ...(tx.meta.postTokenBalances ?? [])]) {
    const key = message.accountKeys?.[balance.accountIndex];
    const address = typeof key === "string" ? key : key?.pubkey;
    if (address) accounts.set(address, { mint: balance.mint, owner: balance.owner ?? accounts.get(address)?.owner });
  }
  const instructions = [...message.instructions, ...(tx.meta.innerInstructions ?? []).flatMap((entry: any) => entry.instructions ?? [])];
  const transfers: ChainTransfer[] = [];
  for (const instruction of instructions) {
    const info = instruction.parsed?.info, type = instruction.parsed?.type;
    if (!info || !["transfer", "transferChecked", "transferWithSeed"].includes(type) || typeof info.destination !== "string") continue;
    if (instruction.program === "system" && info.lamports != null && BigInt(info.lamports) > 0n) {
      transfers.push({ recipient: info.destination, amount: exactAmount(info.lamports, 9), currency: "SOL", recipientType: "wallet" });
    } else if (["spl-token", "spl-token-2022"].includes(instruction.program)) {
      const destination = accounts.get(info.destination);
      const mint = info.mint ?? destination?.mint ?? accounts.get(info.source)?.mint;
      const currency = mint === SOL_USDT_MINT ? "USDT" : mint === SOL_USDC_MINT ? "USDC" : null;
      const raw = info.tokenAmount?.amount ?? info.amount;
      if (!currency || typeof raw !== "string" || !/^\d+$/.test(raw) || BigInt(raw) === 0n) continue;
      transfers.push({ recipient: destination?.owner ?? info.destination, amount: exactAmount(raw, 6), currency,
        recipientType: destination?.owner ? "wallet" : "token_account" });
    }
  }
  return { status: "confirmed" as const, transfers };
}

/** Public chain evidence only: never verifies an order or modifies financial records. */
export function createTransactionLookup({ rpc = evmJsonRpc as Rpc, now = Date.now }: { rpc?: Rpc; now?: () => number } = {}) {
  const cache = new Map<string, { expires: number; data: TransactionDetails }>();
  const pending = new Map<string, Promise<TransactionDetails>>();
  return async (network: string, txid: string): Promise<TransactionDetails> => {
    const normalized = network.trim().toLowerCase().replace(/[\s_-]/g, "");
    const chain = ["eth", "ethereum", "erc20", "ethereummainnet", "eth(erc20)", "ethereum(erc20)"].includes(normalized) ? "eth"
      : ["sol", "solana", "spl", "solanamainnet", "solana(spl)"].includes(normalized) ? "sol" : null;
    if (!chain) throw new Error("Only Ethereum and Solana are supported.");
    if (!(chain === "eth" ? /^0x[0-9a-f]{64}$/i : /^[1-9A-HJ-NP-Za-km-z]{64,90}$/).test(txid)) throw new Error("Invalid transaction TXID.");
    const key = `${chain}:${chain === "eth" ? txid.toLowerCase() : txid}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.data;
    const existing = pending.get(key);
    if (existing) return existing;
    if (pending.size >= 4) return { status: "unavailable", transfers: [], checkedAt: new Date(now()).toISOString(), message: "Other transactions are loading. Please retry shortly." };
    const job = (async (): Promise<TransactionDetails> => {
      let data: TransactionDetails;
      try {
        data = { ...await (chain === "eth" ? ethereum(txid, rpc) : solana(txid, rpc)), checkedAt: new Date(now()).toISOString() };
      } catch {
        data = { status: "unavailable", transfers: [], checkedAt: new Date(now()).toISOString(), message: "The blockchain provider is unavailable or returned incomplete details. Please retry." };
      }
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(key, { data, expires: now() + (data.status === "confirmed" || data.status === "failed" ? 300000 : 15000) });
      return data;
    })();
    pending.set(key, job);
    try { return await job; } finally { pending.delete(key); }
  };
}

export const lookupTransactionDetails = createTransactionLookup();
