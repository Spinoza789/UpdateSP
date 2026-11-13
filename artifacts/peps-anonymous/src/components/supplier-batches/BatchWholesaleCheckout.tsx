import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { createOrder } from "@workspace/api-client-react";
import { Loader2, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAccount } from "@/hooks/use-account";
import { supplierKey, supplierRequest, type SupplierBatch, type SupplierScope } from "@/lib/supplier-batches";

type Delivery = { shippingName: string; shippingPhone: string; shippingEmail: string; shippingAddress: string; shippingCountry: string };
type Preview = {
  linkedOrder: { id: string; code: string } | null;
  reference?: string; token?: string; vendorId?: string; vendorName?: string;
  lineItems?: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  kits?: number; productSubtotal?: number; vendorShipping?: number | null; grandTotal?: number | null;
  shippingCountry?: string; shippingError?: string | null;
};
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const field = "w-full rounded-lg border bg-transparent px-3 py-2 text-sm";
const primary = "rounded-lg bg-[#1B3A7A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2";

export function BatchWholesaleCheckout({ batch, groupBuyId, scope, headers }: {
  batch: SupplierBatch; groupBuyId: string; scope: SupplierScope; headers?: Record<string, string>;
}) {
  const { account } = useAccount();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<Delivery>({ defaultValues: {
    shippingName: "", shippingPhone: "", shippingEmail: "", shippingAddress: "",
    shippingCountry: batch.snapshot.region.countries.length === 1 ? batch.snapshot.region.countries[0] : "",
  } });
  const country = form.watch("shippingCountry");
  const ready = !!preview?.token && preview.vendorShipping != null && preview.shippingCountry != null;
  const [quotedCountry, setQuotedCountry] = useState<string | null>(null);
  const fresh = ready && quotedCountry === country;
  const review = async () => {
    setBusy(true); setError(""); setPreview(null);
    try {
      const result = await supplierRequest<Preview>(scope, groupBuyId,
        `/${encodeURIComponent(batch.id)}/wholesale-preview`, { shippingCountry: country }, "POST", headers);
      if (result.linkedOrder) { navigate(`/account/orders/${encodeURIComponent(result.linkedOrder.id)}`); return; }
      setPreview(result); setQuotedCountry(country);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const place = form.handleSubmit(async delivery => {
    if (!fresh || !account || !preview?.lineItems) return;
    setBusy(true); setError("");
    try {
      // Use the existing wholesale creation and payment flow, not a second order writer.
      const result = await createOrder({
        ...delivery, shippingCountry: preview.shippingCountry,
        telegramUsername: account.telegramUsername, orderType: "wholesale", wholesaleVendorId: preview.vendorId,
        deliveryMethod: "Vendor Shipping", deliveryMethodId: "wholesale", deliveryPrice: 0,
        vendorShipping: preview.vendorShipping!, productSubtotal: preview.productSubtotal!, grandTotal: preview.grandTotal!,
        tip: 0, lineItems: preview.lineItems, notes: `Uther supplier batch ${batch.reference}`,
        supplierBatchCheckout: { groupBuyId, batchId: batch.id, token: preview.token },
      } as Parameters<typeof createOrder>[0]);
      await queryClient.invalidateQueries({ queryKey: supplierKey(scope, groupBuyId) });
      await queryClient.invalidateQueries({ queryKey: ["account", "orders"] });
      setOpen(false);
      navigate(`/account/orders/${encodeURIComponent(result.id)}`);
    } catch (e) {
      const existing = (e as { data?: { orderId?: string } }).data?.orderId;
      if (existing) {
        await queryClient.invalidateQueries({ queryKey: supplierKey(scope, groupBuyId) });
        navigate(`/account/orders/${encodeURIComponent(existing)}`);
      } else { setError((e as Error).message); setPreview(null); }
    } finally { setBusy(false); }
  });
  if (batch.wholesaleOrder) return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <span>Wholesale order <strong>#{batch.wholesaleOrder.code}</strong> · member payments unchanged</span>
      {scope === "organiser" && <button type="button" className={primary}
        onClick={() => navigate(`/account/orders/${encodeURIComponent(batch.wholesaleOrder!.id)}`)}>View wholesale order</button>}
    </div>
  );
  if (scope !== "organiser" || batch.state !== "prepared") return null;
  return <>
    <button type="button" className={primary} disabled={batch.exceptions.length > 0}
      onClick={() => { setError(""); setPreview(null); setOpen(true); }}>
      <ShoppingCart className="h-4 w-4" /> Create wholesale order
    </button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wholesale checkout · {batch.reference}</DialogTitle>
          <DialogDescription>One Uther order for this batch’s allocated kits. Review delivery and current prices before placing an unpaid order. Placing the order commits this batch so it cannot be purchased twice. Members’ orders and payments stay unchanged.</DialogDescription>
        </DialogHeader>
        <Form {...form}><form onSubmit={place} className="space-y-4">
          <fieldset disabled={busy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Delivery details</legend>
            {([
              ["shippingName", "Recipient name", "text", 120],
              ["shippingPhone", "Phone number", "tel", 40],
              ["shippingEmail", "Email address", "email", 254],
              ["shippingCountry", "Country name or code", "text", 100],
            ] as const).map(([name, title, type, maxLength]) => <label key={name} className="space-y-1 text-sm">
              <span>{title}</span>
              <input {...form.register(name, { required: true })} type={type} maxLength={maxLength} required className={field} />
            </label>)}
            <label className="space-y-1 text-sm sm:col-span-2"><span>Full delivery address, including postcode</span>
              <textarea {...form.register("shippingAddress", { required: true })} required maxLength={1024} rows={3} className={field} /></label>
          </fieldset>
          <button type="button" disabled={busy || !country.trim()} onClick={review} className={primary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Review products and shipping
          </button>
          {preview?.lineItems && <section className="space-y-3">
            <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm">
              <thead><tr className="border-b bg-muted/40"><th className="p-2">Product</th><th className="p-2">Kits</th><th className="p-2 text-right">Unit price</th><th className="p-2 text-right">Total</th></tr></thead>
              <tbody>{preview.lineItems.map(item => <tr key={item.productId} className="border-b last:border-0">
                <td className="p-2">{item.productName}</td><td className="p-2">{item.quantity}</td>
                <td className="p-2 text-right whitespace-nowrap">{money(item.unitPrice)}</td><td className="p-2 text-right whitespace-nowrap">{money(item.lineTotal)}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="flex justify-between gap-4"><span>Products · {preview.kits} kits</span><strong>{money(preview.productSubtotal!)}</strong></p>
              <p className="flex justify-between gap-4"><span>Vendor shipping · {preview.shippingCountry}</span><strong>{preview.vendorShipping == null ? "Unavailable" : money(preview.vendorShipping)}</strong></p>
              <p className="flex justify-between gap-4 border-t pt-2"><strong>Total (USD)</strong><strong>{preview.grandTotal == null ? "Unavailable" : money(preview.grandTotal)}</strong></p>
            </div>
            {preview.shippingError && <p role="alert" className="text-sm text-amber-700">{preview.shippingError}</p>}
          </section>}
          {ready && !fresh && <p role="alert" className="text-sm text-amber-700">Destination changed. Review shipping again.</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t pt-3">
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className="px-3 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={busy || !fresh || !account} className={primary}>Place order &amp; continue to payment</button>
          </div>
        </form></Form>
      </DialogContent>
    </Dialog>
  </>;
}
