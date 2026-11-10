import { useEffect, useRef, useState } from "react";

export type KitFeeUpdate = { products: Array<{ id: string; feePerKit: number }>; updatedCount: number };
export async function postGroupBuyKitFees(
  groupId: string, productIds: string[], input: string, adminSecret?: string, signal?: AbortSignal,
): Promise<KitFeeUpdate> {
  const value = input.trim();
  if (!productIds.length) throw new Error("Select at least one product.");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value) || Number(value) > 99_999_999.99) {
    throw new Error("Enter a non-negative fee with at most two decimal places.");
  }
  const response = await fetch(`/api/${adminSecret ? "admin" : "organiser"}/group-buys/${encodeURIComponent(groupId)}/products/kit-fees`, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json", ...(adminSecret ? { "x-admin-secret": adminSecret } : {}) },
    body: JSON.stringify({ productIds, feePerKit: Number(value).toFixed(2) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Fee update failed.");
  return data;
}

export function GroupBuyBulkKitFeeControls({ groupId, currency, selectedIds, adminSecret, disabled = false, onUpdated, onBusyChange }: {
  groupId: string; currency: string; selectedIds: Set<string>; adminSecret?: string; disabled?: boolean;
  onUpdated: (products: KitFeeUpdate["products"]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); onBusyChange?.(false); }, [onBusyChange]);
  async function save() {
    if (saving || disabled) return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true); onBusyChange?.(true); setMessage(null);
    try {
      const result = await postGroupBuyKitFees(groupId, [...selectedIds], fee, adminSecret, controller.signal);
      if (controller.signal.aborted) return;
      onUpdated(result.products);
      setMessage({ text: `Fee set to ${currency} ${Number(fee).toFixed(2)} per kit for ${result.updatedCount} products.`, error: false });
      setFee("");
    } catch (error) {
      if (!controller.signal.aborted) setMessage({ text: error instanceof Error ? error.message : "Fee update failed.", error: true });
    } finally {
      if (!controller.signal.aborted) { setSaving(false); onBusyChange?.(false); }
    }
  }
  return <section aria-label="Bulk fee per kit" className="rounded-xl border border-border p-3 space-y-2">
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-2 text-xs font-semibold">
        Fee per kit ({currency})
        <input aria-label="Bulk fee per kit" type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal"
          value={fee} onChange={event => setFee(event.target.value)} disabled={saving || disabled}
          placeholder="e.g. 2.50" className="h-9 w-28 rounded-lg border border-border bg-transparent px-2" />
      </label>
      <button type="button" onClick={() => void save()} disabled={saving || disabled || !selectedIds.size || !fee.trim()}
        className="h-9 px-3 rounded-lg bg-blue-700 text-white text-xs font-semibold disabled:opacity-50">
        {saving ? "Saving…" : `Set fee for ${selectedIds.size} selected`}
      </button>
    </div>
    <p className="text-xs opacity-75">Uses the product checkboxes or Select all. This replaces each selected product’s fee; it does not add to it. Set 0 to remove the fee. Group-buy only; existing orders are unchanged.</p>
    {message && <p role={message.error ? "alert" : "status"} className={`text-xs font-semibold ${message.error ? "text-red-600" : ""}`}>{message.text}</p>}
  </section>;
}
