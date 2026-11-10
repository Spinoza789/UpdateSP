import { Truck } from "lucide-react";

type OfferVendor = {
  name: string;
  freeShippingThreshold?: number | null;
};

export function FreeShippingNotice({ vendor }: { vendor: OfferVendor | null | undefined }) {
  const threshold = vendor?.freeShippingThreshold;
  if (!vendor || typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) return null;

  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(threshold) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(threshold);

  return (
    <aside
      aria-label="Free shipping offer"
      className="flex items-start gap-3 rounded-2xl border p-4 sm:p-5"
      style={{
        background: "color-mix(in srgb, var(--t-green, #16a34a) 8%, var(--t-surface))",
        borderColor: "color-mix(in srgb, var(--t-green, #16a34a) 30%, var(--t-border))",
      }}
    >
      <Truck className="mt-0.5 h-6 w-6 shrink-0" style={{ color: "var(--t-green, #16a34a)" }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-base font-bold sm:text-lg" style={{ color: "var(--t-text)" }}>
          Free shipping on orders over {amount}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--t-muted)" }}>
          {vendor.name} · Based on your product subtotal before credits, shipping and fees. Available for supported shipping destinations.
        </p>
      </div>
    </aside>
  );
}
