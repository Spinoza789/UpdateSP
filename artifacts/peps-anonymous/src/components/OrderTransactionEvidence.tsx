import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderTransactionReferences, transactionChain, transactionExplorer, type OrderTransactionReferences } from "@/lib/order-transaction-evidence";

interface Evidence {
  status: "confirmed" | "pending" | "failed" | "unavailable";
  blockTime?: string | null; senderAddress?: string | null; message?: string;
  transfers: Array<{ sender?: string; senderType?: "wallet" | "token_account" }>;
}
function Transaction({ groupBuyId, orderId, txid, label, network }: {
  groupBuyId: string; orderId: string; txid: string; label: string; network?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const chain = transactionChain(txid, network), explorer = transactionExplorer(txid, network);
  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "100px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const query = useQuery<Evidence>({
    queryKey: ["organiser-transaction-evidence", groupBuyId, orderId, txid],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders/${encodeURIComponent(orderId)}/transaction-details?${new URLSearchParams({ txid })}`, {
        credentials: "include", signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load blockchain details.");
      return result;
    },
    enabled: !!chain && visible && !!groupBuyId && !!orderId,
    staleTime: 60_000, gcTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  const evidence = query.data;
  const addressKey = (value: string) => chain === "Ethereum" ? value.toLowerCase() : value;
  const senders = [...new Map((evidence?.transfers ?? []).flatMap(transfer =>
    transfer.sender ? [[`${transfer.senderType}:${addressKey(transfer.sender)}`, transfer] as const] : [])).values()];
  const timestamp = evidence?.blockTime && !Number.isNaN(new Date(evidence.blockTime).getTime()) ? evidence.blockTime : null;
  const addressLink = (address: string) => chain === "Ethereum"
    ? `https://etherscan.io/address/${encodeURIComponent(address)}` : `https://solscan.io/account/${encodeURIComponent(address)}`;
  const address = (value: string) => <a href={addressLink(value)} target="_blank" rel="noopener noreferrer"
    className="break-all underline" style={{ overflowWrap: "anywhere", color: "var(--t-blue)" }}>{value}</a>;
  return <div ref={ref} className="min-w-0 rounded-lg border p-2 text-[11px]" style={{ borderColor: "var(--t-border)", color: "var(--t-text)", overflowWrap: "anywhere" }}>
    <p className="font-semibold">{label} · Transaction ID</p>
    {explorer ? <a href={explorer} target="_blank" rel="noopener noreferrer" className="block break-all font-mono underline"
      style={{ color: "var(--t-blue)" }}>{txid}<span className="block font-sans">Open in {chain === "Ethereum" ? "Etherscan" : "Solscan"} ↗</span></a>
      : <p className="break-all font-mono">{txid}</p>}
    {chain && <>
      {(!visible || query.isPending) && <p role="status">Loading blockchain payment details…</p>}
      {evidence && <dl className="mt-2 space-y-1">
        <div><dt className="font-semibold">Blockchain payment time (UTC)</dt><dd>{timestamp
          ? <time dateTime={timestamp}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(timestamp))} UTC</time>
          : "Not available"}</dd></div>
        {senders.map(sender => <div key={`${sender.senderType}:${sender.sender}`}>
          <dt className="font-semibold">{sender.senderType === "token_account" ? "Sender token account · owner unavailable" : "Sender wallet"}</dt>
          <dd>{address(sender.sender!)}</dd>
        </div>)}
        {evidence.senderAddress && !senders.some(sender => addressKey(sender.sender!) === addressKey(evidence.senderAddress!)) && <div>
          <dt className="font-semibold">{chain === "Solana" ? "Transaction signer / fee payer" : "Transaction sender"}</dt>
          <dd>{address(evidence.senderAddress)}</dd>
        </div>}
        {!senders.length && !evidence.senderAddress && <div><dt className="font-semibold">Sender wallet</dt><dd>Not available</dd></div>}
        <div><dt className="font-semibold">Blockchain status</dt><dd>{evidence.status}</dd></div>
      </dl>}
      {(query.error || evidence?.message || evidence?.status === "unavailable") && <p role="alert" className="mt-1">
        {query.error instanceof Error ? query.error.message : evidence?.message ?? "Blockchain details are temporarily unavailable."}
      </p>}
      {(query.isError || evidence && (!timestamp || evidence.status !== "confirmed")) && <button type="button" className="mt-1 underline"
        disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Refreshing…" : "Retry blockchain lookup"}</button>}
      {evidence && <p className="mt-1" style={{ color: "var(--t-muted)" }}>
        Public blockchain details only; this does not verify the order payment. Senders may be exchange or contract wallets.
      </p>}
    </>}
  </div>;
}
export function OrderTransactionEvidence({ groupBuyId, orderId, order }: {
  groupBuyId?: string; orderId: string; order: OrderTransactionReferences;
}) {
  if (!groupBuyId) return null;
  return <div className="min-w-0 space-y-2" aria-label="Payment transaction details">
    {orderTransactionReferences(order).map(transaction => <Transaction key={`${groupBuyId}:${orderId}:${transaction.txid}`}
      groupBuyId={groupBuyId} orderId={orderId} {...transaction} />)}
  </div>;
}
