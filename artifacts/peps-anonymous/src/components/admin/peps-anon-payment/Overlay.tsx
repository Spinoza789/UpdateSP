import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Accessible in-tree dialog: focuses on open, traps Tab, Escape closes, restores focus on close. */
export function Overlay({ title, subtitle, onClose, canClose = true, side = "right", closeTestId, headerExtra, footer, children, testId }: {
  title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; canClose?: boolean; side?: "right" | "center";
  closeTestId: string; headerExtra?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; testId?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const canRef = useRef(canClose); canRef.current = canClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (prev && typeof prev.focus === "function" && document.contains(prev)) prev.focus();
    };
  }, []);
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.stopPropagation(); if (canRef.current) closeRef.current(); return; }
    if (e.key !== "Tab" || !panel.current) return;
    const f = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[href],[tabindex]:not([tabindex="-1"])'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  return createPortal(<div className={"pap-root pap-overlay " + (side === "right" ? "pap-right" : "pap-center")} onKeyDown={onKey}>
    <div className="pap-backdrop" aria-hidden onClick={() => { if (canClose) onClose(); }} />
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="pap-panel outline-none" data-testid={testId}>
      <header className="flex items-start gap-3 border-b px-5 py-4" style={{ borderColor: "var(--t-border)" }}>
        <div className="min-w-0 flex-1">
          <h3 id={id} className="text-base font-bold tracking-tight break-words" style={{ color: "var(--t-text)" }}>{title}</h3>
          {subtitle && <div className="mt-0.5 text-xs" style={{ color: "var(--t-subtle)" }}>{subtitle}</div>}
        </div>
        {headerExtra}
        <button type="button" className="pap-btn !px-2" aria-label="Close" disabled={!canClose} onClick={onClose} data-testid={closeTestId}><X className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <footer className="border-t px-5 py-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>{footer}</footer>}
    </div>
  </div>, document.body);
}

export function Notice({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return <p role={message.ok ? "status" : "alert"} className="mb-3 rounded-lg border px-3 py-2 text-sm"
    style={{ borderColor: message.ok ? "rgba(21,128,61,.3)" : "rgba(180,35,24,.35)", background: message.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.07)", color: message.ok ? "#15803D" : "#B42318" }}>{message.text}</p>;
}
