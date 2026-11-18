import { PlayCircle } from "lucide-react";
import { HELP_VIDEO_BY_SLUG, canWatchHelpVideo } from "@/data/help-videos";
import { openCryptoGuide, openHelpVideo, useHelpViewer, type CryptoChapter } from "./help-video-store";

const linkClass = "inline-flex items-center gap-1.5 text-[13px] font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded text-left";
const linkStyle = { color: "var(--t-blue)" } as const;

/**
 * Small text link that opens a guide video in a pop-up over the page.
 * It renders nothing when the viewer may not watch that video, so it is safe to place anywhere.
 */
export function WatchLink({ slug, label, showLength = true, className = "" }: { slug: string; label?: string; showLength?: boolean; className?: string }) {
  const viewer = useHelpViewer();
  const video = HELP_VIDEO_BY_SLUG[slug];
  if (!video || (video.audience !== "vendor" && !canWatchHelpVideo(video, viewer))) return null;
  return (
    <button type="button" onClick={() => openHelpVideo(slug)} className={`${linkClass} ${className}`} style={linkStyle} data-testid={`watch-link-${slug}`}>
      <PlayCircle className="w-4 h-4 shrink-0" aria-hidden />
      <span>{label ?? `Watch: ${video.title}`}{showLength ? ` (${video.length})` : ""}</span>
    </button>
  );
}

/** Opens the "which exchange, which wallet" questions and plays the matching crypto guide. */
export function CryptoGuideLink({ label = "Never paid with crypto? Watch the step-by-step guide", chapter, className = "" }: { label?: string; chapter?: CryptoChapter; className?: string }) {
  return (
    <button type="button" onClick={() => openCryptoGuide(chapter)} className={`${linkClass} ${className}`} style={linkStyle} data-testid={`watch-link-crypto${chapter ? `-${chapter}` : ""}`}>
      <PlayCircle className="w-4 h-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
