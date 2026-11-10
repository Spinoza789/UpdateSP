import { useEffect, useRef, useState } from "react";

type Props = {
  vendor: { id: string; name: string; freeShippingThreshold?: number | null };
  secret: string;
  onSaved: (threshold: number | null) => void;
};

export function WholesaleFreeShipping({ vendor, secret, onSaved }: Props) {
  const [value, setValue] = useState(vendor.freeShippingThreshold == null ? "" : String(vendor.freeShippingThreshold));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  return <form className="mt-4 border-t border-slate-200 pt-4" onSubmit={async event => {
    event.preventDefault();
    if (request.current) return;
    const trimmed = value.trim();
    const threshold = trimmed === "" ? null : Number(trimmed);
    if (threshold !== null && (!/^\d+(\.\d{1,2})?$/.test(trimmed) || !Number.isFinite(threshold) || threshold <= 0 || threshold > 99_999_999.99)) {
      setError("Enter a positive USD amount with up to two decimal places, or leave blank to disable.");
      return;
    }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`/api/admin/wholesale-vendors/${encodeURIComponent(vendor.id)}`, {
        method: "PUT", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ freeShippingThreshold: threshold }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save free shipping.");
      if (body.id !== vendor.id || body.freeShippingThreshold !== threshold) throw new Error("Invalid response. Refresh settings before trying again.");
      if (!controller.signal.aborted) { onSaved(threshold); setSaved(true); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not save free shipping.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }}>
    <label htmlFor="wholesale-free-shipping-threshold" className="block text-sm font-semibold text-slate-800">
      Free shipping on orders of at least (USD)
    </label>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input id="wholesale-free-shipping-threshold" type="number" min="0.01" max="99999999.99" step="0.01"
        value={value} disabled={busy} placeholder="Disabled"
        onChange={event => { setValue(event.target.value); setSaved(false); setError(""); }}
        className="h-9 w-44 rounded-lg border border-slate-200 px-3 text-sm text-slate-900" />
      <button type="submit" disabled={busy} className="h-9 rounded-lg bg-blue-900 px-3 text-xs font-semibold text-white disabled:opacity-50">
        {busy ? "Saving…" : "Save free shipping"}
      </button>
      {saved && <span role="status" className="text-xs text-green-700">Saved</span>}
    </div>
    <p className="mt-2 text-xs text-slate-500">For {vendor.name} only. Based on product subtotal before credits, shipping and fees. Shared orders combine all members’ products from this vendor. Leave blank to disable. Existing placed and locked orders are not changed.</p>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </form>;
}
