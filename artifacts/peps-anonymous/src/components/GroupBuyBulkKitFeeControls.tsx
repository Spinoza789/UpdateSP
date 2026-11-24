import { useEffect, useRef, useState } from "react";

export type KitFeeUpdate = { products: Array<{ id: string; feePerKit: number; chargeFullFeeOnHalfKit?: boolean }>; updatedCount: number };
export async function saveGroupBuyKitFeeSettings(
  groupId: string, productIds: string[],
  settings: { feePerKit?: string; chargeFullFeeOnHalfKit?: boolean },
  adminSecret?: string, signal?: AbortSignal,
): Promise<KitFeeUpdate> {
  if (!productIds.length) throw new Error("Select at least one product.");
  const response = await fetch(`/api/${adminSecret ? "admin" : "organiser"}/group-buys/${encodeURIComponent(groupId)}/products/kit-fees`, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json", ...(adminSecret ? { "x-admin-secret": adminSecret } : {}) },
    body: JSON.stringify({ productIds, ...settings }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Fee update failed.");
  if (!Array.isArray(data.products) || typeof data.updatedCount !== "number") throw new Error("Invalid fee update response. Refresh and retry.");
  return data;
}

export async function postGroupBuyKitFees(
  groupId: string, productIds: string[], input: string, adminSecret?: string, signal?: AbortSignal, chargeFullFeeOnHalfKit?: boolean,
): Promise<KitFeeUpdate> {
  const value = input.trim();
  if (!productIds.length) throw new Error("Select at least one product.");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value) || Number(value) > 99_999_999.99) {
    throw new Error("Enter a non-negative fee with at most two decimal places.");
  }
  return saveGroupBuyKitFeeSettings(groupId, productIds, {
    feePerKit: Number(value).toFixed(2),
    ...(chargeFullFeeOnHalfKit !== undefined ? { chargeFullFeeOnHalfKit } : {}),
  }, adminSecret, signal);
}

export function GroupBuyBulkKitFeeControls({ groupId, currency, selectedIds, adminSecret, disabled = false, onUpdated, onBusyChange }: {
  groupId: string; currency: string; selectedIds: Set<string>; adminSecret?: string; disabled?: boolean;
  onUpdated: (products: KitFeeUpdate["products"]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [fee, setFee] = useState("");
  const [halfKitRule, setHalfKitRule] = useState("keep");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); onBusyChange?.(false); }, [onBusyChange]);
  async function save() {
    if (saving || disabled || (!fee.trim() && halfKitRule === "keep")) return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true); onBusyChange?.(true); setMessage(null);
    try {
      const rule = halfKitRule === "keep" ? undefined : halfKitRule === "full";
      const result = fee.trim()
        ? await postGroupBuyKitFees(groupId, [...selectedIds], fee, adminSecret, controller.signal, rule)
        : await saveGroupBuyKitFeeSettings(groupId, [...selectedIds],
          { chargeFullFeeOnHalfKit: rule }, adminSecret, controller.signal);
      if (controller.signal.aborted) return;
      onUpdated(result.products);
      setMessage({ text: fee.trim()
        ? `Fee set to ${currency} ${Number(fee).toFixed(2)} per kit for ${result.updatedCount} products.`
        : `Half-kit fee rule updated for ${result.updatedCount} products. Existing fee amounts and orders are unchanged.`, error: false });
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
      <button type="button" onClick={() => void save()} disabled={saving || disabled || !selectedIds.size || (!fee.trim() && halfKitRule === "keep")}
        className="h-9 px-3 rounded-lg bg-blue-700 text-white text-xs font-semibold disabled:opacity-50">
        {saving ? "Saving…" : `Set fee for ${selectedIds.size} selected`}
      </button>
      <label className="flex items-center gap-2 text-xs font-semibold">
        Half-kit fee
        <select aria-label="Bulk half-kit fee rule" value={halfKitRule} onChange={event => setHalfKitRule(event.target.value)}
          disabled={saving || disabled} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="keep">Keep each product’s current rule</option>
          <option value="full">Charge full kit fee on half kits</option>
          <option value="proportional">Split fee for half kits</option>
        </select>
      </label>
    </div>
    <p className="text-xs opacity-75">Uses the product checkboxes or Select all. This replaces each selected product’s fee; it does not add to it. Set 0 to remove the fee. Leave the fee blank to change only the half-kit rule. Group-buy only; existing orders are unchanged.</p>
    <p className="text-xs opacity-75">Full-fee rule: a {currency} 3 fee charges {currency} 3 for ½ or 1 kit, and {currency} 6 for 1½ or 2 kits, per product.</p>
    {message && <p role={message.error ? "alert" : "status"} className={`text-xs font-semibold ${message.error ? "text-red-600" : ""}`}>{message.text}</p>}
  </section>;
}
