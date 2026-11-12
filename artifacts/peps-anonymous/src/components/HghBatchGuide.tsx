import { useState } from "react";

/** This guide was requested for HGH 36IU only, not other HGH groups. */
export function HghBatchGuide({ groupBuyId }: { groupBuyId?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (groupBuyId !== "UAJBM") return null;

  return (
    <details className="rounded-xl border p-4" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}>
      <summary className="cursor-pointer text-sm font-semibold">
        How the batch system works <span className="font-normal" style={{ color: "var(--t-muted)" }}>· 2 min video</span>
      </summary>
      <p className="mt-3 mb-3 text-sm" style={{ color: "var(--t-muted)" }}>
        Watch this short guide to understand batches for your HGH 36IU group-buy order.
      </p>
      <video
        className="w-full aspect-video rounded-lg bg-black"
        aria-label="HGH 36IU batch system video guide"
        controls
        playsInline
        preload="none"
        src="/api/group-buys/UAJBM/batch-guide.mp4"
        onError={() => setFailed(true)}
      >
        Your browser does not support video playback.
      </video>
      {failed && <p role="alert" className="mt-3 text-sm">
        The video could not load. Please refresh the page and try again.
      </p>}
    </details>
  );
}
