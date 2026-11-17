import React, { useEffect, useState } from "react";
import { adminAuth } from "../../../lib/admin-auth";

type Details = {
  status: "confirmed" | "failed" | "pending" | "unavailable";
  transfers: Array<{ recipient: string; amount: string; currency: string; recipientType: "wallet" | "token_account" }>;
  checkedAt: string;
  message?: string;
};
const labels = { confirmed: "Confirmed", failed: "Failed", pending: "Pending / not found", unavailable: "Unavailable" };

export function TransactionDetails({ txid, network, expectedWallet }: { txid: string; network: string; expectedWallet?: string }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true); setError(""); setDetails(null);
    void (async () => {
      try {
        const query = new URLSearchParams({ txid, network });
        const response = await adminAuth.request(`/api/admin/vendor-payments/transaction-details?${query}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load transaction details.");
        if (!Object.hasOwn(labels, body.status) || !Array.isArray(body.transfers)) throw new Error("Transaction details were not returned. Please retry.");
        if (current) setDetails(body);
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : "Unable to load transaction details.");
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; controller.abort(); };
  }, [txid, network, attempt]);
  const matches = (recipient: string) => !!expectedWallet && (/^0x/i.test(expectedWallet)
    ? expectedWallet.toLowerCase() === recipient.toLowerCase() : expectedWallet === recipient);
  return <div className="mt-2 rounded-md border p-2 text-xs" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)" }} aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span style={{ color: "var(--t-subtle)" }}>{loading ? "Loading on-chain details…" : details ? `On-chain: ${labels[details.status]}` : "On-chain details unavailable"}</span>
      <button type="button" className="underline disabled:opacity-50" disabled={loading} onClick={() => setAttempt(value => value + 1)}
        data-testid="transaction-details-refresh" aria-label="Refresh on-chain transaction details">Refresh</button>
    </div>
    {error && <p className="mt-2" role="alert">{error}</p>}
    {details?.message && <p className="mt-2">{details.message}</p>}
    {details?.status === "confirmed" && <>
      {details.transfers.length > 1 && <p className="mt-2" style={{ color: "var(--t-subtle)" }}>Multiple transfers found — review the receiving addresses.</p>}
      {expectedWallet && details.transfers.length > 0 && !details.transfers.some(transfer => matches(transfer.recipient))
        && <p className="mt-2" style={{ color: "#B4770E" }}>No transfer matches the saved destination.</p>}
      <div className="space-y-3">{details.transfers.map((transfer, index) => <dl key={index} className="mt-2 min-w-0">
        <dt style={{ color: "var(--t-subtle)" }}>{transfer.recipientType === "token_account" ? "Receiving token account · owner unavailable" : "Receiving wallet"}</dt>
        <dd className="mt-1 break-all font-mono select-all">{transfer.recipient}</dd>
        <dt className="mt-1" style={{ color: "var(--t-subtle)" }}>Amount transferred</dt>
        <dd className="font-semibold tabular-nums break-all">{transfer.amount} {transfer.currency}</dd>
        {matches(transfer.recipient) && <dd className="mt-1 font-medium" style={{ color: "#15803D" }}>Matches saved destination</dd>}
      </dl>)}</div>
      {!details.transfers.length && <p className="mt-2">No supported direct ETH/SOL or USDT/USDC transfer was found.</p>}
    </>}
    {details?.status === "failed" && <p className="mt-2">The transaction failed; no transferred amount is counted.</p>}
    {details?.status === "pending" && <p className="mt-2">Not confirmed or not yet available from this provider. Please retry.</p>}
    {!loading && <p className="mt-2" style={{ color: "var(--t-subtle)" }}>Read-only chain evidence; payment status is unchanged. Network fees and internal ETH transfers are not included.</p>}
  </div>;
}
