import { useRef, useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";

interface Change { id: string; name: string; beforeCost: string | null; beforePrice: string | null; cost?: string; price?: string }
interface Review { rows: number; unchanged: number; changes: Change[]; previewToken: string; applied: boolean; updated: number }
const ENDPOINT = "/api/admin/wholesale-products/price-csv";
const money = (v: string | null) => v == null ? "Not set" : `$${Number(v).toFixed(2)}`;
const button = "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";

export function WholesalePriceCsv({ secret, vendorId, vendorName, disabledReason, onApplied, onBusyChange }: {
  secret: string; vendorId: string; vendorName: string; disabledReason?: string;
  onApplied: () => void | Promise<void>; onBusyChange?: (busy: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const guard = useRef(false);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const blocked = busy || !!disabledReason;
  const start = () => { guard.current = true; setBusy(true); onBusyChange?.(true); setError(null); };
  const end = () => { guard.current = false; setBusy(false); onBusyChange?.(false); };
  const fail = async (r: Response) => {
    const body = await r.json().catch(() => null);
    return new Error(body?.error ?? `Request failed (${r.status}).`);
  };
  const request = async (apply: boolean, content = csv) => {
    if (guard.current || disabledReason) return;
    start();
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ vendorId, csv: content, apply, ...(apply ? { previewToken: review?.previewToken } : {}) }),
      });
      if (!response.ok) { setReview(null); throw await fail(response); }
      const result: Review = await response.json();
      setReview(result);
      if (result.applied) await onApplied();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not import prices."); }
    finally { end(); }
  };
  const choose = async (file: File | undefined) => {
    if (!file || guard.current || disabledReason) return;
    setReview(null); setError(null); setCsv(""); setFilename(file.name);
    if (!/\.csv$/i.test(file.name) || file.size > 1_000_000) {
      setError("Choose a comma-separated .csv file up to 1 MB."); return;
    }
    start();
    let content: string;
    try { content = await file.text(); }
    catch { setError("Could not read this CSV file."); end(); return; }
    end();
    setCsv(content); await request(false, content);
  };
  const download = async () => {
    if (guard.current || disabledReason) return;
    start();
    try {
      const response = await fetch(`${ENDPOINT}?vendorId=${encodeURIComponent(vendorId)}`, {
        credentials: "include", headers: { "x-admin-secret": secret },
      });
      if (!response.ok) throw await fail(response);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `${vendorName.replace(/[^a-z0-9]+/gi, "-")}-wholesale-prices.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not download prices."); }
    finally { end(); }
  };
  return <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4" data-testid="wholesale-price-csv">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-slate-800">Update {vendorName} prices by CSV</h4>
        <p className="mt-1 text-xs text-slate-600">Download all active catalogue products assigned to this supplier, including empty prices and products not currently enabled for wholesale. Search filters do not limit the download.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={blocked} onClick={() => void download()} className={`${button} border-blue-200 bg-white text-blue-900`} data-testid="download-wholesale-price-csv">
          <Download className="h-3.5 w-3.5" /> Download price CSV
        </button>
        <button type="button" disabled={blocked} onClick={() => fileInput.current?.click()} className={`${button} border-blue-800 bg-[#1B3A7A] text-white`} data-testid="import-wholesale-price-csv">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import price CSV
        </button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" aria-label="Wholesale price CSV file" className="hidden"
          disabled={blocked} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void choose(file); }} />
      </div>
    </div>
    <p className="text-xs text-slate-600">Edit Supplier cost (USD) and Selling price (USD), keeping Product IDs unchanged. Use plain numbers with up to two decimal places. Blank cells mean no change; 0 sets a zero price. Import shows a review first. Existing orders, stock, supplier assignments and availability are unchanged.</p>
    {disabledReason && <p className="text-xs text-amber-800">{disabledReason}</p>}
    {filename && <p className="break-all text-xs text-slate-500">File: {filename}</p>}
    {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
    {csv && !review && !busy && <button type="button" disabled={blocked} className={`${button} bg-white`} onClick={() => void request(false)}>Review CSV again</button>}
    {review && <div className="space-y-3 text-xs">
      {review.applied
        ? <p role="status" className="font-semibold text-emerald-700">Updated {review.updated} product{review.updated === 1 ? "" : "s"}. Product prices have been refreshed.</p>
        : <p role="status" className="font-semibold text-slate-700">{review.changes.length} products will change · {review.unchanged} unchanged · {review.rows} CSV rows reviewed. Nothing has been saved yet.</p>}
      {review.changes.length > 0 && <div className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white" data-testid="wholesale-price-csv-preview">
        <table className="w-full min-w-[500px] text-left">
          <thead className="sticky top-0 bg-slate-100"><tr>
            <th className="p-2">Product</th><th className="p-2">Supplier cost (USD)</th><th className="p-2">Selling price (USD)</th>
          </tr></thead>
          <tbody>{review.changes.map(p => <tr key={p.id} className="border-t border-slate-100">
            <td className="p-2">{p.name}</td>
            <td className="p-2">{p.cost !== undefined ? <>{money(p.beforeCost)} → <strong>{money(p.cost)}</strong></> : <>{money(p.beforeCost)} <span className="text-slate-400">(unchanged)</span></>}</td>
            <td className="p-2">{p.price !== undefined ? <>{money(p.beforePrice)} → <strong>{money(p.price)}</strong></> : <>{money(p.beforePrice)} <span className="text-slate-400">(unchanged)</span></>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {!review.applied && review.changes.length > 0 && <button type="button" disabled={blocked}
        onClick={() => void request(true)} className={`${button} bg-[#1B3A7A] text-white`} data-testid="apply-wholesale-price-csv">
        Apply {review.changes.length} product price updates
      </button>}
    </div>}
  </div>;
}
