import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, ChevronRight, Clock } from "lucide-react";
import PaymentPanel from "@/components/PaymentPanel";
import { WatchLink } from "@/components/help/WatchLink";

type WARStatus = "pending" | "confirmed" | "rejected";
type WARData = {
  id: number;
  amountUsd: number;
  status: WARStatus;
  paymentTestAmount: number | null;
  testPaymentTxHash: string | null;
  paymentTxHash: string | null;
  paymentCryptoNetwork: string | null;
  paymentCryptoCurrency: string | null;
  createdAt: string;
  rejectionReason: string | null;
};
type FeeReview = { outdatedHigherFee: boolean; canReplace: boolean; paymentStarted: boolean };
type ApiResp = { request: WARData | null; cryptoOptions?: unknown[]; accessFee?: number | null; feeReview?: FeeReview | null };

export function WholesaleAccessSection() {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<WARData | null>(null);
  const [accessFee, setAccessFee] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feeReview, setFeeReview] = useState<FeeReview | null>(null);
  const [confirmsNoPayment, setConfirmsNoPayment] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [reviewedRequestId, setReviewedRequestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/account/wholesale-access");
      if (r.ok) {
        const d: ApiResp = await r.json();
        setRequest(d.request);
        setAccessFee(typeof d.accessFee === "number" && Number.isFinite(d.accessFee) && d.accessFee > 0 ? d.accessFee : null);
        setFeeReview(d.feeReview ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/account/wholesale-access", { method: "POST" });
      if (r.ok) {
        const d: ApiResp = await r.json();
        setRequest(d.request);
        await fetchStatus();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleReplace = async () => {
    if (!request || accessFee === null || !confirmsNoPayment) return;
    setReplacing(true);
    setError(null);
    try {
      const response = await fetch("/api/account/wholesale-access/replace-outdated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, expectedFee: accessFee, confirmsNoPayment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not replace this request.");
      setRequest(data.request);
      setAccessFee(data.accessFee);
      setFeeReview(data.feeReview);
      setConfirmsNoPayment(false);
      setSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not replace this request.");
      await fetchStatus();
    } finally {
      setReplacing(false);
    }
  };

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (newStatus === "confirmed" || newStatus === "pending_confirmation") {
      setSubmitted(true);
      await fetchStatus();
    }
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
      </div>
    );
  }

  if (request?.status === "confirmed") {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(22,163,74,0.15)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--t-text)" }}>Wholesale Access Granted</h3>
            <p className="text-sm mt-2" style={{ color: "light-dark(#166534,#86efac)" }}>
              Your ${request.amountUsd} fee has been confirmed and added as store credit.
            </p>
          </div>
          <a
            href="/wholesale"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
            style={{ background: "#16a34a" }}
          >
            Open Wholesale Shop <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  if (request?.status === "rejected") {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Request Not Approved</p>
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>Your wholesale access request was rejected.</p>
            </div>
          </div>
          {request.rejectionReason && (
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(239,68,68,0.7)" }}>Reason</p>
              <p className="text-sm" style={{ color: "var(--t-text)" }}>{request.rejectionReason}</p>
            </div>
          )}
          <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  if (submitted || request?.paymentTxHash) {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.3)" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)" }}>
            <Clock className="w-7 h-7" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--t-text)" }}>Verifying Payment</h3>
            <p className="text-sm mt-2" style={{ color: "var(--t-muted)" }}>
              Your transaction is being verified on-chain. This usually takes just a few minutes — refresh this page to check the status.
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>You'll be notified via Telegram when your access is ready.</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full max-w-[520px] space-y-6">
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>How it works</h3>
          <div className="!mt-1"><WatchLink slug="wholesale" label="Watch: how wholesale works" /></div>
          <ol className="space-y-3">
            {[
              { n: "1", text: "Select Get Wholesale Access from the navigation." },
              { n: "2", text: accessFee === null ? "Pay the access fee shown on your request." : `Pay the $${accessFee.toLocaleString("en-US", { maximumFractionDigits: 2 })} access fee.` },
              { n: "3", text: accessFee === null ? "The full access fee is added back to your account as credit." : `The full $${accessFee.toLocaleString("en-US", { maximumFractionDigits: 2 })} is added back to your account as credit.` },
            ].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: "var(--t-blue)" }}>{n}</span>
                <p className="text-sm leading-snug pt-0.5" style={{ color: "var(--t-text)" }}>{text}</p>
              </li>
            ))}
          </ol>
          <div className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              The credit does not expire and can be used at any time.
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--t-blue)" }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {creating ? "Setting up..." : "Get Wholesale Access"}
          </button>
        </div>
      </div>
    );
  }

  const paymentStatus =
    request.testPaymentTxHash ? "test_confirmed" :
    request.paymentTestAmount !== null ? "test_ready" :
    "unpaid";

  return (
    <div className="w-full max-w-[520px] space-y-4">
      <div className="rounded-xl px-4 py-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Wholesale Access Fee</p>
        <p className="text-2xl font-black mt-1" style={{ color: "var(--t-text)" }}>${request.amountUsd}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>One-time fee · returned as store credit</p>
      </div>

      {feeReview?.outdatedHigherFee && (
        <div role="alert" className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)", color: "var(--t-text)" }}>
          <h3 className="font-bold">This request has an older, higher fee</h3>
          <p className="text-sm">
            Your original request is for <strong>${request.amountUsd}</strong>.
            The current access fee is <strong>${accessFee}</strong>.
          </p>
          {feeReview.canReplace ? (
            <>
              <p className="text-sm">Before paying, replace this untouched request at the current fee. The old request stays in your history.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmsNoPayment} disabled={replacing}
                  onChange={event => setConfirmsNoPayment(event.target.checked)} />
                I have not sent any payment for this request, including a test payment.
              </label>
              <button type="button" onClick={handleReplace} disabled={!confirmsNoPayment || replacing}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "var(--t-blue)" }}>
                {replacing ? "Replacing request..." : `Replace with current $${accessFee} fee`}
              </button>
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>Already sent money? Do not reset or pay again. Contact support with your transaction details.</p>
            </>
          ) : (
            <>
              <p className="text-sm">Payment details or a transaction have already been recorded, so the original amount is preserved. If you have not paid, contact support before sending money. Do not start a second payment.</p>
              {reviewedRequestId !== request.id && (
                <button type="button" onClick={() => setReviewedRequestId(request.id)}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold">
                  Continue original ${request.amountUsd} request
                </button>
              )}
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {(!feeReview?.outdatedHigherFee || (!feeReview.canReplace && reviewedRequestId === request.id)) && <PaymentPanel
        key={request.id}
        apiPrefix={`/api/account/wholesale-access/requests/${request.id}`}
        grandTotal={request.amountUsd}
        paymentStatus={paymentStatus}
        paymentTxHash={request.paymentTxHash}
        paymentTestAmount={request.paymentTestAmount}
        testPaymentTxHash={request.testPaymentTxHash}
        paymentsEnabled={true}
        onStatusChange={handleStatusChange}
      />}
    </div>
  );
}
