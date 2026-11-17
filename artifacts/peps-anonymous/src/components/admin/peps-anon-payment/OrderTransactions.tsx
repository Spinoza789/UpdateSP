import React from "react";
import type { LedgerOrder, Receipt } from "./model";

function explorer(txid: string, network: string | null | undefined) {
  const chain = (network ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (["ethereum", "eth", "erc20", "ethereummainnet", "eth(erc20)", "ethereum(erc20)"].includes(chain)
    && /^0x[0-9a-f]{64}$/i.test(txid)) return `https://etherscan.io/tx/${encodeURIComponent(txid)}`;
  if (["solana", "sol", "spl", "solanamainnet", "solana(spl)"].includes(chain)
    && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(txid)) return `https://solscan.io/tx/${encodeURIComponent(txid)}`;
  return null;
}

export function OrderTransactions({ order, receipt }: { order: LedgerOrder; receipt: Receipt | null }) {
  const transaction = (txid: string, network?: string | null, currency?: string | null) => {
    const href = explorer(txid, network);
    return <div className="min-w-0">
      <p className="mb-1 text-xs" style={{ color: "var(--t-subtle)" }}>{[currency, network].filter(Boolean).join(" · ") || "Network not recorded"}</p>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="block break-all font-mono text-xs underline" style={{ color: "var(--t-blue)" }}>{txid}</a>
        : <span className="block break-all font-mono text-xs">{txid}</span>}
    </div>;
  };
  const supplier = receipt && !receipt.voidedAt && receipt.txid ? receipt : null;
  return <section className="mb-4 rounded-lg border p-4" style={{ borderColor: "var(--t-border)" }} data-testid="payment-order-transactions" aria-label="Payment transactions">
    <h3 className="mb-3 text-sm font-semibold">Payment transactions</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="min-w-0">
        <h4 className="mb-2 text-xs font-semibold">Buyer payments</h4>
        {order.buyerTransactions?.length ? <div className="space-y-3">{order.buyerTransactions.map(ref =>
          <div key={`${ref.orderId}-${ref.txid}`}>
            <p className="mb-1 text-xs" style={{ color: "var(--t-subtle)" }}>Order {ref.reference} · {ref.kind}</p>
            {transaction(ref.txid, ref.network, ref.currency)}
          </div>)}</div> : <p className="text-xs" style={{ color: "var(--t-subtle)" }}>No buyer payment TXID recorded.</p>}
      </div>
      <div className="min-w-0">
        <h4 className="mb-2 text-xs font-semibold">Supplier payment</h4>
        {supplier ? transaction(supplier.txid, supplier.network, supplier.currency)
          : <p className="text-xs" style={{ color: "var(--t-subtle)" }}>No supplier payment TXID recorded.</p>}
      </div>
    </div>
  </section>;
}
