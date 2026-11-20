import { MarkOrdersPaid } from "./MarkOrdersPaid";

export function OrderAdditionalPayment({ groupBuyId, orderId, amountDue = 0, currency, balancePaymentStatus, allowed, orderStatus, onSaved }: {
  groupBuyId: string; orderId: string; amountDue?: number; currency: string;
  balancePaymentStatus?: string | null; allowed: boolean; orderStatus?: string;
  onSaved: () => void | Promise<void>;
}) {
  const outstanding = Number.isFinite(amountDue) && amountDue > 0;
  if (!outstanding && balancePaymentStatus !== "confirmed") return null;
  return <section className="my-3 rounded-xl border p-3" data-testid={`additional-payment-${orderId}`}
    style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
    <h4 className="text-xs font-bold uppercase tracking-wide">Additional payment</h4>
    {outstanding ? <>
      <p className="mt-1 text-sm font-semibold" data-testid={`additional-amount-${orderId}`}>
        Outstanding: {currency} {amountDue.toFixed(2)}
      </p>
      <p className="my-2 text-xs" style={{ color: "var(--t-muted)" }}>
        Separate from the original order payment. Marking the original order Paid again does not confirm this amount.
        Confirm receipt here to clear the balance and refresh batch eligibility.
      </p>
      {!["Cancelled", "Refunded", "Draft"].includes(orderStatus ?? "") && <MarkOrdersPaid
        groupBuyId={groupBuyId} orderIds={[orderId]} allowed={allowed}
        label={`Mark additional ${currency} ${amountDue.toFixed(2)} paid`}
        balance={{ amount: amountDue, currency }} onSaved={onSaved} />}
    </> : <p className="mt-1 text-sm font-semibold text-emerald-600" data-testid={`additional-paid-${orderId}`}>Additional payment paid</p>}
  </section>;
}
