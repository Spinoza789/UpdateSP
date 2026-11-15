import { useEffect, useRef, useState } from "react";
import { CARRIERS_17TRACK } from "@/lib/carriers";
import { field, fieldCls } from "@/components/vendor-ui";
import { vendorTranslate as t } from "@/lib/vendor-language";

export type VendorTrackingParcel = { id: string; courier: string; internationalTrackingNumber: string; localTrackingNumber: string | null };
export function vendorTrackingParcels(order: {
  trackingPackages?: VendorTrackingParcel[]; trackingNumber?: string | null; carrier?: string | null;
}): VendorTrackingParcel[] {
  return order.trackingPackages?.length ? order.trackingPackages : order.trackingNumber
    ? [{ id: "legacy-0", courier: order.carrier || "", internationalTrackingNumber: order.trackingNumber, localTrackingNumber: null }] : [];
}
const carriers = [...new Set(CARRIERS_17TRACK.filter(c => c.code > 0).map(c => c.label))].sort();

function ParcelRow({ value, index, disabled, onChange, onRemove, detect }: {
  value: VendorTrackingParcel; index: number; disabled: boolean;
  onChange: (value: VendorTrackingParcel) => void; onRemove: () => void;
  detect?: (number: string) => Promise<number | null>;
}) {
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  useEffect(() => () => { version.current++; }, []);
  const known = carriers.includes(value.courier);
  const [other, setOther] = useState(!!value.courier && !known);
  const change = (next: VendorTrackingParcel) => { version.current++; setBusy(false); setHint(""); onChange(next); };
  const detectCarrier = async () => {
    if (!detect || value.internationalTrackingNumber.trim().length < 3 || disabled) return;
    const ticket = ++version.current;
    setBusy(true); setHint("");
    try {
      const code = await detect(value.internationalTrackingNumber.trim());
      if (ticket !== version.current) return;
      const match = CARRIERS_17TRACK.find(c => c.code > 0 && c.code === code);
      if (match) { setOther(false); latestChange.current({ ...value, courier: match.label }); setHint(`Detected ${match.label}. You can change this if needed.`); }
      else setHint("Carrier could not be identified. Please select it manually.");
    } catch { if (ticket === version.current) setHint("Detection unavailable. Please select a carrier manually."); }
    finally { if (ticket === version.current) setBusy(false); }
  };
  return <fieldset disabled={disabled} className="rounded-xl border p-3 space-y-2 min-w-0" style={{ borderColor: "var(--t-border)" }}>
    <div className="flex justify-between gap-2 text-xs"><span>{t("Parcel")} {index + 1}</span>
      <button type="button" onClick={onRemove} className="underline" data-testid={`button-remove-tracking-${index}`}>{t("Remove")}</button></div>
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="text-xs">{t("Carrier")}
        <select value={other ? "other" : value.courier} onChange={e => { setOther(e.target.value === "other"); change({ ...value, courier: e.target.value === "other" ? "" : e.target.value }); }}
          required className={fieldCls} style={field} data-testid={`select-carrier-${index}`}>
          <option value="">{t("Choose carrier")}</option>{carriers.map(c => <option key={c}>{c}</option>)}<option value="other">{t("Other…")}</option>
        </select>
      </label>
      <label className="text-xs">{t("Tracking number")}
        <input value={value.internationalTrackingNumber} onChange={e => change({ ...value, internationalTrackingNumber: e.target.value })}
          onBlur={() => void detectCarrier()} required maxLength={200} className={fieldCls} style={field} data-testid={`input-tracking-${index}`} />
      </label>
      {other && <label className="text-xs sm:col-span-2">{t("Carrier name")}<input required maxLength={80} value={value.courier} onChange={e => change({ ...value, courier: e.target.value })} className={fieldCls} style={field} data-testid={`input-carrier-${index}`} /></label>}
      {value.localTrackingNumber && <p className="text-xs break-all sm:col-span-2">{t("Local tracking")}: {value.localTrackingNumber}</p>}
    </div>
    {detect && <div className="text-xs" aria-live="polite">{t(busy ? "Finding carrier with 17TRACK…" : hint)} <button type="button" disabled={busy || value.internationalTrackingNumber.trim().length < 3} className="underline" onClick={() => void detectCarrier()}>{t("Detect carrier")}</button></div>}
  </fieldset>;
}

/** Additional rows; the existing primary tracking controls retain their behaviour. */
export function AdditionalTrackingParcels({ parcels, onChange, disabled = false, detect }: {
  parcels: VendorTrackingParcel[]; onChange: (value: VendorTrackingParcel[]) => void; disabled?: boolean;
  detect?: (number: string) => Promise<number | null>;
}) {
  return <div className="space-y-3 w-full min-w-0">
    {parcels.map((p, i) => <ParcelRow key={p.id} value={p} index={i + 1} disabled={disabled} detect={detect}
      onChange={next => onChange(parcels.map(old => old.id === p.id ? next : old))}
      onRemove={() => onChange(parcels.filter(old => old.id !== p.id))} />)}
    <button type="button" disabled={disabled || parcels.length >= 19} onClick={() => onChange([...parcels, {
      id: crypto.randomUUID(), courier: "", internationalTrackingNumber: "", localTrackingNumber: null,
    }])} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" data-testid="button-add-tracking">{t("Add tracking number")}</button>
    <p className="text-xs" style={{ color: "var(--t-muted)" }}>{t("Each parcel can use a different carrier. Maximum 20 tracking numbers.")}</p>
  </div>;
}

export function TrackingParcelList({ order }: { order: Parameters<typeof vendorTrackingParcels>[0] }) {
  return <div className="space-y-2">{vendorTrackingParcels(order).map(p => <div key={p.id} className="text-sm min-w-0">
    <p className="font-semibold">{p.courier}</p><p className="font-mono break-all" data-testid="text-tracking">{p.internationalTrackingNumber}</p>
    {p.localTrackingNumber && <p className="font-mono break-all">{t("Local tracking")}: {p.localTrackingNumber}</p>}
  </div>)}</div>;
}
