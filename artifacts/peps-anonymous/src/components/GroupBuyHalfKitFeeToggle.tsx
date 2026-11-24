import { useEffect, useRef, useState } from "react";
import { saveGroupBuyKitFeeSettings, type KitFeeUpdate } from "./GroupBuyBulkKitFeeControls";

export function GroupBuyHalfKitFeeToggle({ groupId, productId, productName, checked, adminSecret, disabled = false, onUpdated }: {
  groupId: string;
  productId: string;
  productName: string;
  checked: boolean;
  adminSecret?: string;
  disabled?: boolean;
  onUpdated: (products: KitFeeUpdate["products"]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    setMessage(null);
    setSaving(false);
    return () => pending.current?.abort();
  }, [groupId, productId]);

  async function save(value: boolean) {
    if (saving || disabled) return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveGroupBuyKitFeeSettings(groupId, [productId],
        { chargeFullFeeOnHalfKit: value }, adminSecret, controller.signal);
      if (controller.signal.aborted) return;
      const product = result.products.find(item => item.id === productId);
      if (!product || product.chargeFullFeeOnHalfKit !== value) throw new Error("Half-kit fee setting was not saved. Refresh and retry.");
      onUpdated(result.products);
      setMessage({ text: "Half-kit fee setting saved. Existing orders are unchanged." });
    } catch (error) {
      if (!controller.signal.aborted) setMessage({ error: true, text: error instanceof Error ? error.message : "Could not save the half-kit fee setting." });
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return <div className="space-y-1 text-xs">
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} disabled={saving || disabled}
        style={{ width: 16, height: 16, minHeight: 16, padding: 0, flexShrink: 0 }}
        aria-label={`Charge full kit fee on half kits for ${productName}`}
        onChange={event => void save(event.target.checked)} />
      <span>Charge full kit fee on half kits</span>
    </label>
    {saving && <p role="status">Saving half-kit fee setting…</p>}
    {message && <p role={message.error ? "alert" : "status"} className={message.error ? "text-red-600" : ""}>{message.text}</p>}
  </div>;
}
