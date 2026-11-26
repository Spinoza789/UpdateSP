export interface OrderTransactionReferences {
  paymentTxHash?: string | null; paymentTxHashes?: string[] | null;
  testPaymentTxHash?: string | null; balanceTxHash?: string | null;
  paymentCryptoNetwork?: string | null;
  balanceCryptoNetwork?: string | null;
}
export function transactionChain(txid: string, hint?: string | null): "Ethereum" | "Solana" | null {
  const network = hint?.toLowerCase().replace(/[\s_-]/g, "");
  if (network && !["eth", "ethereum", "erc20", "ethereummainnet", "eth(erc20)", "ethereum(erc20)",
    "sol", "solana", "spl", "solanamainnet", "solana(spl)"].includes(network)) return null;
  if (/^0x[0-9a-f]{64}$/i.test(txid)) return network?.startsWith("sol") || network === "spl" ? null : "Ethereum";
  if (/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(txid)) return network && !network.startsWith("sol") && network !== "spl" ? null : "Solana";
  return null;
}
export function transactionExplorer(txid: string, hint?: string | null) {
  const chain = transactionChain(txid, hint);
  return chain === "Ethereum" ? `https://etherscan.io/tx/${encodeURIComponent(txid)}`
    : chain === "Solana" ? `https://solscan.io/tx/${encodeURIComponent(txid)}` : null;
}
export function orderTransactionReferences(order: OrderTransactionReferences) {
  const candidates = [
    { label: "Test payment", txid: order.testPaymentTxHash, network: order.paymentCryptoNetwork },
    { label: "Payment", txid: order.paymentTxHash, network: order.paymentCryptoNetwork },
    ...(order.paymentTxHashes ?? []).map((txid, index) => ({ label: `Payment ${index + 1}`, txid, network: order.paymentCryptoNetwork })),
    { label: "Balance payment", txid: order.balanceTxHash, network: order.balanceCryptoNetwork },
  ];
  const seen = new Set<string>();
  return candidates.flatMap(candidate => {
    const txid = typeof candidate.txid === "string" ? candidate.txid.trim() : "";
    const key = txid.startsWith("0x") || txid.startsWith("0X") ? txid.toLowerCase() : txid;
    if (!txid || seen.has(key)) return [];
    seen.add(key);
    return [{ ...candidate, txid }];
  });
}
