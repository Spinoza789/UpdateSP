import { useEffect, useRef, useState } from "react";
import { helpVideoUrl } from "@/data/help-videos";

/** Seconds into the video used for the still: just past any fade from black. */
const THUMB_AT = 1.5;

/**
 * The start of the video itself as the thumbnail. A muted, paused video element is
 * pointed at an early frame; the browser fetches only the header and that frame.
 * Nothing loads until the card scrolls near the screen, and it never plays.
 */
export function HelpVideoThumb({ slug, className = "" }: { slug: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === "undefined");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (near || !box.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "300px" });
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [near]);
  useEffect(() => { setReady(false); setFailed(false); }, [slug]);
  return (
    <span ref={box} className={`absolute inset-0 block ${className}`} style={{ background: "#0B1B3F" }} aria-hidden data-testid={`help-thumb-${slug}`}>
      {near && !failed && (
        <video key={slug} muted playsInline preload="metadata" tabIndex={-1} disablePictureInPicture
          src={`${helpVideoUrl(slug)}#t=${THUMB_AT}`}
          className="h-full w-full object-cover transition-opacity duration-300" style={{ opacity: ready ? 1 : 0, pointerEvents: "none" }}
          onLoadedData={() => setReady(true)} onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/** White play disc with a navy triangle, as in the design. */
export function PlayDisc({ size = 40, tone = "white" }: { size?: number; tone?: "white" | "soft" }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 56 56" className="shrink-0" style={tone === "white" ? { filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" } : undefined}>
      <circle cx="28" cy="28" r="28" fill={tone === "white" ? "#FFFFFF" : "#E9F0FB"} />
      <path d="M23 18l16 10-16 10z" fill="#1B3A7A" />
    </svg>
  );
}
