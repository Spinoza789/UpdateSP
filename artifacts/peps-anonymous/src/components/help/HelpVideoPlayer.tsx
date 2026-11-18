import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  CRYPTO_EXCHANGES, CRYPTO_WALLETS, HELP_VIDEO_BY_SLUG, cryptoGuideSlug, helpVideoUrl,
  type CryptoExchange, type CryptoWallet, type HelpVideo,
} from "@/data/help-videos";
import {
  closeHelpVideo, findChapterParent, playableSlug, readCryptoChoice, saveCryptoChoice, type CryptoChoice, type HelpVideoRequest,
} from "./help-video-store";

/** One standard video element. It never starts by itself: the member presses play. */
export function HelpVideoFrame({ slug, title }: { slug: string; title: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [slug]);
  if (failed) return (
    <div className="aspect-video w-full grid place-items-center px-6 text-center text-[13px]" style={{ background: "#0f172a", color: "#cbd5e1" }} role="alert" data-testid="help-video-error">
      This video could not be loaded. Please try again in a moment, or open a support ticket if it keeps happening.
    </div>
  );
  return (
    <video key={slug} className="aspect-video w-full bg-black" controls playsInline preload="metadata"
      aria-label={title} onError={() => setFailed(true)} data-testid="help-video">
      {/* #t shows a frame from the start of the video before play is pressed. It never starts by itself. */}
      <source src={`${helpVideoUrl(slug)}#t=0.1`} type="video/mp4" onError={() => setFailed(true)} />
    </video>
  );
}

function ChoiceRow<T extends string>({ question, options, value, onPick }: { question: string; options: readonly { id: T; label: string }[]; value: T | null; onPick: (id: T) => void }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>{question}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const on = value === option.id;
          return <button key={option.id} type="button" aria-pressed={on} onClick={() => onPick(option.id)} data-testid={`crypto-choice-${option.id}`}
            className="h-9 px-4 rounded-full text-[13px] font-semibold"
            style={on ? { background: "var(--t-blue-deep)", color: "#fff" } : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>{option.label}</button>;
        })}
      </div>
    </fieldset>
  );
}

/** The two questions (exchange, wallet), the matching guide and its five chapter clips. */
export function CryptoGuide({ initialChapter }: { initialChapter?: string }) {
  const [choice, setChoice] = useState<Partial<CryptoChoice>>(() => readCryptoChoice() ?? {});
  const [asking, setAsking] = useState(() => !readCryptoChoice());
  const [chapter, setChapter] = useState<string | null>(initialChapter ?? null);
  const guide = choice.exchange && choice.wallet ? HELP_VIDEO_BY_SLUG[cryptoGuideSlug(choice.exchange, choice.wallet)] : undefined;
  const pick = (next: Partial<CryptoChoice>) => {
    const merged = { ...choice, ...next };
    setChoice(merged);
    if (merged.exchange && merged.wallet) { saveCryptoChoice(merged as CryptoChoice); setAsking(false); }
  };
  const playing = guide && chapter ? guide.chapters?.find(c => c.slug === `${guide.slug}-${chapter}`) : undefined;
  return (
    <div className="space-y-4" data-testid="crypto-guide">
      {asking || !guide ? (
        <div className="space-y-3 rounded-xl p-4" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <ChoiceRow<CryptoExchange> question="Which exchange do you use?" options={CRYPTO_EXCHANGES} value={choice.exchange ?? null} onPick={exchange => pick({ exchange })} />
          <ChoiceRow<CryptoWallet> question="Which wallet?" options={CRYPTO_WALLETS} value={choice.wallet ?? null} onPick={wallet => pick({ wallet })} />
          <p className="text-xs" style={{ color: "var(--t-subtle)" }}>We remember your answer on this device so you are only asked once.</p>
        </div>
      ) : (
        <p className="text-[13px]" style={{ color: "var(--t-muted)" }}>
          Showing the guide for <strong style={{ color: "var(--t-text)" }}>{CRYPTO_EXCHANGES.find(e => e.id === choice.exchange)?.label} to {CRYPTO_WALLETS.find(w => w.id === choice.wallet)?.label}</strong>.{" "}
          <button type="button" className="font-semibold underline" style={{ color: "var(--t-blue)" }} onClick={() => setAsking(true)} data-testid="crypto-change">Change</button>
        </p>
      )}
      {guide && <>
        <HelpVideoFrame slug={playing?.slug ?? guide.slug} title={playing ? `${guide.title}: ${playing.title}` : guide.title} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Chapters">
          <button type="button" aria-pressed={!playing} onClick={() => setChapter(null)} className="h-8 px-3 rounded-lg text-xs font-semibold"
            style={!playing ? { background: "var(--t-blue-deep)", color: "#fff" } : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>Full guide ({guide.length})</button>
          {guide.chapters?.map(c => {
            const key = c.slug.slice(guide.slug.length + 1);
            const on = playing?.slug === c.slug;
            return <button key={c.slug} type="button" aria-pressed={on} onClick={() => setChapter(key)} data-testid={`crypto-chapter-${key}`} className="h-8 px-3 rounded-lg text-xs font-semibold"
              style={on ? { background: "var(--t-blue-deep)", color: "#fff" } : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>{c.title} ({c.length})</button>;
          })}
        </div>
      </>}
    </div>
  );
}

export default function HelpVideoPlayer({ request }: { request: HelpVideoRequest }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeHelpVideo(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, []);

  let video: HelpVideo | undefined;
  let chapterTitle: string | undefined;
  let slug = "";
  if (request.kind === "video") {
    video = HELP_VIDEO_BY_SLUG[request.slug] ?? findChapterParent(request.slug);
    chapterTitle = video && !HELP_VIDEO_BY_SLUG[request.slug] ? video.chapters?.find(c => c.slug === request.slug)?.title : undefined;
    slug = video ? (chapterTitle ? request.slug : playableSlug(video)) : "";
  }
  const isCrypto = request.kind === "crypto" || video?.category === "Paying" && !!video.chapters?.length;
  const title = request.kind === "crypto" ? "Paying with crypto" : video ? (chapterTitle ? `${video.title}: ${chapterTitle}` : video.title) : "Video not found";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(5,12,28,0.72)" }} onClick={closeHelpVideo} data-testid="help-video-popup">
      <section role="dialog" aria-modal="true" aria-labelledby="help-video-title" onClick={event => event.stopPropagation()}
        className="w-full sm:max-w-[760px] max-h-[92dvh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px]"
        style={{ background: "var(--t-surface)", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="help-video-title" className="text-[17px] font-bold" style={{ color: "var(--t-text)" }}>{title}</h2>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--t-muted)" }}>{request.kind === "crypto" ? "A step-by-step guide for your exchange and wallet"
              : video ? `${chapterTitle ? video.chapters?.find(c => c.slug === slug)?.length ?? video.length : video.length} · ${video.category === "Paying" ? "Paying" : video.category}` : ""}</p>
          </div>
          <button ref={closeButton} type="button" onClick={closeHelpVideo} aria-label="Close video" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--t-surface2)]"
            style={{ color: "var(--t-text)", border: "1px solid var(--t-border)" }} data-testid="help-video-close"><X className="w-[18px] h-[18px]" strokeWidth={2.5} /></button>
        </div>
        <div className={request.kind === "crypto" || (isCrypto && !chapterTitle) ? "px-5" : ""}>
        {request.kind === "crypto" ? <CryptoGuide initialChapter={request.chapter} />
          : !video ? <p className="px-5 text-[13px]" style={{ color: "var(--t-muted)" }}>That video does not exist. Browse all guides on the Help page.</p>
          : isCrypto && !chapterTitle ? <CryptoGuideFor video={video} />
          : <HelpVideoFrame slug={slug} title={title} />}
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <p className="flex-1 text-[13px]" style={{ color: "var(--t-muted)" }}>The page behind stays where you left it. Close to carry on.</p>
          <a href="/help" className="px-1 py-3 text-[14px] font-bold" style={{ color: "var(--t-blue-deep)" }}>More guides</a>
        </div>
      </section>
    </div>
  );
}

/** A specific crypto guide opened directly (for example from the Help page or an assistant). */
function CryptoGuideFor({ video }: { video: HelpVideo }) {
  const [chapter, setChapter] = useState<string | null>(null);
  const playing = chapter ? video.chapters?.find(c => c.slug === chapter) : undefined;
  return (
    <div className="space-y-3">
      <HelpVideoFrame slug={playing?.slug ?? video.slug} title={playing ? `${video.title}: ${playing.title}` : video.title} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chapters">
        <button type="button" aria-pressed={!playing} onClick={() => setChapter(null)} className="h-8 px-3 rounded-lg text-xs font-semibold"
          style={!playing ? { background: "var(--t-blue-deep)", color: "#fff" } : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>Full guide ({video.length})</button>
        {video.chapters?.map(c => <button key={c.slug} type="button" aria-pressed={playing?.slug === c.slug} onClick={() => setChapter(c.slug)} className="h-8 px-3 rounded-lg text-xs font-semibold"
          style={playing?.slug === c.slug ? { background: "var(--t-blue-deep)", color: "#fff" } : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>{c.title} ({c.length})</button>)}
      </div>
    </div>
  );
}
