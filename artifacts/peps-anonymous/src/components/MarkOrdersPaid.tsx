import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function MarkOrdersPaid({ groupBuyId, orderIds, onSaved, label, allowed = true, paymentStatusField, balance }: {
  groupBuyId: string; orderIds: string[]; onSaved: () => void | Promise<void>; label?: string; allowed?: boolean;
  paymentStatusField?: { value: string; onChange: (value: string) => void };
  balance?: { amount: number; currency: string };
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const disabled = !orderIds.length || !allowed || orderIds.length > 100 || saving;
  function openConfirmation() {
    if (disabled) return;
    setError(""); setResult(""); setNote(""); setOpen(true);
  }
  async function save() {
    if (!note.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders/${balance ? "mark-balance-paid" : "mark-paid"}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, note: note.trim(), ...(balance ? { expectedAmountDue: balance.amount } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to confirm payment.");
      setResult(balance ? (data.updated ? "Outstanding balance marked paid." : "Balance already paid; left unchanged.") : `${data.updated} order${data.updated === 1 ? "" : "s"} marked paid.${data.skipped ? ` ${data.skipped} already paid; left unchanged.` : ""}`);
      // Do not offer a duplicate payment action if a refresh fails after saving.
      setOpen(false); setNote("");
      try {
        await queryClient.invalidateQueries({
          predicate: query => query.queryKey[0] === "supplier-batches" && query.queryKey[2] === groupBuyId,
        });
        await onSaved();
      }
      catch { setError("Payment saved, but the order list could not refresh. Please refresh the page."); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm payment.");
    } finally { setSaving(false); }
  }
  return <span className="inline-flex flex-col items-start gap-1" onClick={event => event.stopPropagation()}>
    {paymentStatusField ? <select aria-label="Payment Status" value={paymentStatusField.value} disabled={disabled}
      onChange={event => {
        if (event.target.value === "confirmed" && paymentStatusField.value !== "confirmed") openConfirmation();
        else paymentStatusField.onChange(event.target.value);
      }}
      className="w-full h-8 px-2 rounded-lg text-xs"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}>
      {["unpaid", "pending_confirmation", "confirmed", "failed", "refunded", "test_ready", "test_confirmed"].map(status =>
        <option key={status} value={status}>{status === "confirmed" ? "Paid" : status.replaceAll("_", " ")}</option>)}
    </select> : <button type="button" disabled={disabled} onClick={openConfirmation}
      className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
      data-testid={balance ? `mark-balance-paid-${orderIds[0]}` : undefined}
      style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-border)", color: "var(--t-blue-deep)" }}>{label ?? (balance ? "Mark balance paid" : "Mark as paid")}</button>}
    {!allowed && <span className="text-xs" style={{ color: "var(--t-muted)" }}>Admin must enable payment-status editing for this group buy.</span>}
    {orderIds.length > 100 && <span className="text-xs" style={{ color: "var(--t-muted)" }}>Select up to 100 orders at a time.</span>}
    {result && <span role="status" className="text-xs" style={{ color: "var(--t-text)" }}>{result}</span>}
    {error && !open && <span role="alert" className="text-xs text-red-600">{error}</span>}
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{balance ? "Confirm additional payment received" : `Mark ${orderIds.length === 1 ? "order" : `${orderIds.length} orders`} as paid`}</DialogTitle>
          <DialogDescription>{balance
            ? `Confirm you received the additional payment of ${balance.currency} ${balance.amount.toFixed(2)}. This settles only the outstanding balance; the original payment and fulfilment stay unchanged. Batch eligibility is refreshed; other batch requirements still apply. No member notification is sent.`
            : "Only confirm money you have received. This confirms the main order payment, not a separate outstanding balance. No blockchain transaction ID is required."}</DialogDescription>
        </DialogHeader>
        <label className="text-sm font-semibold">Payment note (staff only)
          <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={4} disabled={saving}
            placeholder="e.g. Bank transfer received; checked statement."
            className="mt-2 w-full rounded-lg border p-3 text-sm" />
        </label>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>Required. Saved on every selected order with your username and the date/time. Already-paid orders are left unchanged.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button type="button" disabled={!note.trim() || saving} onClick={save} className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ background: "var(--t-blue-deep)" }}>{saving ? "Saving…" : "Confirm paid"}</button>
        </div>
      </DialogContent>
    </Dialog>
  </span>;
}
