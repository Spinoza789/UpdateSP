import React from "react";
import { Copy } from "lucide-react";
import type { Wallet } from "./model";

export function WalletList({ wallets, activeId, onCopy }: { wallets: Wallet[]; activeId?: string; onCopy: (address: string) => void }) {
  if (!wallets.length) return <p className="rounded-lg border-l-4 p-3 text-sm" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))" }} data-testid="payment-no-wallet">
    The vendor needs to add a payment wallet in their Settings before a payment can be recorded.</p>;
  return <ul className="space-y-2">{wallets.map((w) => <li key={w.id} className="rounded-lg border p-3 text-xs" style={{ borderColor: w.id === activeId ? "var(--t-blue-40)" : "var(--t-border)", background: w.id === activeId ? "var(--t-blue-05)" : "transparent" }}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-semibold text-[13px]">{w.label ? `${w.label} · ` : ""}{w.currency} / {w.network}</p>
      <button type="button" className="pap-btn !min-h-[28px] !text-xs" data-testid={`payment-copy-${w.id}`} onClick={() => onCopy(w.address)}><Copy className="h-3 w-3" />Copy address</button>
    </div>
    <code className="mt-1.5 block break-all select-all rounded bg-[var(--t-bg)] px-2 py-1">{w.address}</code>
  </li>)}</ul>;
}
