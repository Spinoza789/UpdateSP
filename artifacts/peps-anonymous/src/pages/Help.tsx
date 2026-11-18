import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Lock, Search } from "lucide-react";
import { ResearchShell } from "@/components/ResearchShell";
import {
  CRYPTO_EXCHANGES, CRYPTO_WALLETS, HELP_VIDEOS, HELP_VIDEO_BY_SLUG, canWatchHelpVideo, cryptoGuideSlug,
  type CryptoExchange, type CryptoWallet, type HelpVideo, type HelpVideoCategory,
} from "@/data/help-videos";
import {
  findChapterParent, openHelpVideo, playableSlug, readCryptoChoice, saveCryptoChoice, useHelpViewer, type CryptoChoice,
} from "@/components/help/help-video-store";
import { HelpVideoThumb, PlayDisc } from "@/components/help/HelpVideoThumb";

/* Help and video guides: every guide video in one place. Separate from the Learning Hub on purpose. */

const NAVY = "var(--t-blue-deep)";
const text = "var(--t-text)", muted = "var(--t-muted)", subtle = "var(--t-subtle)", surface = "var(--t-surface)", border = "1px solid var(--t-border)";
const SOFT_BLUE = "color-mix(in srgb, var(--t-blue) 12%, var(--t-surface))";
/** Videos about one particular group buy get their own section, apart from the general group buy guides. */
const UTHER = ["uther-gb"];
/** The first video of each role series. It explains the role, so non-holders see it under "Get involved". */
const ROLE_INTRO: Record<"organiser" | "poolLeader" | "reshipper", string> = { organiser: "organiser-1-create", poolLeader: "pool-leader", reshipper: "reshippers" };
const SECTIONS: { id: string; title: string; categories: HelpVideoCategory[]; note?: string; only?: string[]; except?: string[] }[] = [
  { id: "group-buys", title: "Group buys and the batch system", categories: ["Group buys"], except: UTHER },
  { id: "uther", title: "Uther group buy", categories: ["Group buys"], only: UTHER, note: "Specific to the Uther group buy" },
  { id: "wholesale", title: "Shared orders and wholesale", categories: ["Shared orders and wholesale"], note: "Shown to logged-in members" },
  { id: "testing", title: "Testing", categories: ["Testing"] },
  { id: "account", title: "Your account", categories: ["Your account"] },
  { id: "lonely-vial", title: "The Lonely Vial", categories: ["The Lonely Vial"] },
];
const ROLE_CARD: Record<string, { title: string; apply: string }> = {
  "organiser-1-create": { title: "Run a group buy", apply: "Apply to organise" },
  "pool-leader": { title: "Lead a testing pool", apply: "Apply to lead" },
  "becoming-a-reshipper": { title: "Become a reshipper", apply: "Apply to reship" },
  reshippers: { title: "The reshipper job", apply: "Apply to reship" },
  "selling-on-the-lonely-vial": { title: "Sell your vials", apply: "Apply to sell" },
};
const faqTitle = (video: HelpVideo) => video.title.replace(/^Common questions:\s*/i, "").replace(/^./, c => c.toUpperCase());

/** Thumbnail from the start of the video, with the play disc and the length badge. */
function Thumb({ video, slug, disc = 40, label }: { video: HelpVideo; slug?: string; disc?: number; label?: string }) {
  return (
    <span className="relative block aspect-video w-full overflow-hidden" style={{ background: "#0B1B3F" }}>
      <HelpVideoThumb slug={slug ?? playableSlug(video)} />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(11,27,63,0.18)" }}>
        <PlayDisc size={disc} />
        {label && <span className="px-3 text-center text-[17px] font-bold text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{label}</span>}
      </span>
      <span className="absolute bottom-2.5 right-2.5 rounded-md px-[7px] py-0.5 text-[12px] font-semibold tabular-nums text-white" style={{ background: "#000" }}>{video.length}</span>
    </span>
  );
}

function VideoCard({ video, large, onOpen, title, summary }: { video: HelpVideo; large?: boolean; onOpen?: () => void; title?: string; summary?: string }) {
  return (
    <button type="button" onClick={onOpen ?? (() => openHelpVideo(video.slug))} data-testid={`help-card-${video.slug}`} aria-label={`Play ${title ?? video.title} (${video.length})`}
      className="flex flex-col items-stretch justify-start overflow-hidden text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: surface, border, borderRadius: large ? 18 : 16 }}>
      <Thumb video={video} disc={large ? 56 : 40} />
      <span className="block" style={{ padding: large ? "16px 18px 18px" : "12px 14px 14px" }}>
        <span className="block font-bold" style={{ color: text, fontSize: large ? 17 : 15 }}>{title ?? video.title}</span>
        <span className="mt-1 block text-[13px]" style={{ color: muted, lineHeight: 1.45 }}>{summary ?? video.summary}</span>
      </span>
    </button>
  );
}

function SectionHeading({ title, note, pill }: { title: string; note?: string; pill?: string }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-baseline gap-2.5">
      <h2 className="m-0 text-[20px] font-bold tracking-tight" style={{ color: text }}>{title}</h2>
      {note && <span className="text-[13px]" style={{ color: subtle }}>{note}</span>}
      {pill && <span className="inline-flex items-center gap-1.5 self-center rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: NAVY, background: SOFT_BLUE }}><Lock className="h-3 w-3" strokeWidth={2.5} />{pill}</span>}
    </div>
  );
}
const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 20 } as const;

function ChoiceButtons<T extends string>({ label, options, value, onPick }: { label: string; options: readonly { id: T; label: string }[]; value?: T; onPick: (id: T) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-[13px] font-semibold" style={{ color: text }}>{label}</legend>
      <div className="flex gap-2">
        {options.map(option => {
          const on = value === option.id;
          return <button key={option.id} type="button" aria-pressed={on} onClick={() => onPick(option.id)} data-testid={`crypto-choice-${option.id}`}
            className="h-[46px] flex-1 rounded-xl text-[14px]"
            style={on ? { border: "2px solid var(--t-blue)", background: SOFT_BLUE, color: NAVY, fontWeight: 700 } : { border, background: surface, color: text, fontWeight: 600 }}>{option.label}</button>;
        })}
      </div>
    </fieldset>
  );
}

/** Two questions on the left, the matching guide and its steps on the right. */
function CryptoSection() {
  const [choice, setChoice] = useState<CryptoChoice>(() => readCryptoChoice() ?? { exchange: "coinbase", wallet: "exodus" });
  const guide = HELP_VIDEO_BY_SLUG[cryptoGuideSlug(choice.exchange, choice.wallet)];
  const pick = (next: Partial<CryptoChoice>) => { const merged = { ...choice, ...next }; setChoice(merged); saveCryptoChoice(merged); };
  const pair = `${CRYPTO_EXCHANGES.find(e => e.id === choice.exchange)?.label} to ${CRYPTO_WALLETS.find(w => w.id === choice.wallet)?.label}`;
  return (
    <section id="help-crypto" className="flex scroll-mt-24 flex-wrap gap-7 p-5 sm:p-7" style={{ background: surface, border, borderRadius: 20 }} data-testid="help-section-crypto" aria-label="Paying with crypto">
      <div className="flex min-w-0 flex-col gap-[18px]" style={{ flex: "1 1 300px" }}>
        <div>
          <h2 className="m-0 text-[22px] font-bold tracking-tight" style={{ color: text }}>Paying with crypto</h2>
          <p className="mt-1.5 text-[14px]" style={{ color: muted, lineHeight: 1.5 }}>Answer two questions and we will show the guide that matches your apps.</p>
        </div>
        <ChoiceButtons<CryptoExchange> label="1. Which exchange do you use?" options={CRYPTO_EXCHANGES} value={choice.exchange} onPick={exchange => pick({ exchange })} />
        <ChoiceButtons<CryptoWallet> label="2. Which wallet?" options={CRYPTO_WALLETS} value={choice.wallet} onPick={wallet => pick({ wallet })} />
        <p className="m-0 text-[13px]" style={{ color: subtle, lineHeight: 1.5 }}>Not sure yet? Pick any pair. The first minute explains what an exchange and a wallet are.</p>
      </div>
      {guide && <div className="flex min-w-0 flex-col gap-3.5" style={{ flex: "2 1 420px" }}>
        <button type="button" onClick={() => openHelpVideo(guide.slug)} className="overflow-hidden text-left" style={{ borderRadius: 14 }} aria-label={`Play the ${pair} guide (${guide.length})`} data-testid="help-crypto-play">
          <Thumb video={guide} slug={guide.slug} disc={72} label={pair} />
        </button>
        <div className="text-[13px] font-semibold" style={{ color: text }}>Jump to a step</div>
        <div className="flex flex-wrap gap-2">
          {guide.chapters?.map(chapter => (
            <button key={chapter.slug} type="button" onClick={() => openHelpVideo(chapter.slug)} data-testid={`help-crypto-step-${chapter.slug.slice(guide.slug.length + 1)}`}
              className="rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold" style={{ border, background: "var(--t-surface2)", color: text }}>
              {chapter.title} <span className="font-medium" style={{ color: subtle }}>{chapter.length}</span></button>))}
        </div>
      </div>}
    </section>
  );
}

export default function Help() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/help/:slug");
  const viewer = useHelpViewer();
  const [query, setQuery] = useState("");

  // /help/<slug> opens that video over the page (links from Sage and the Telegram bot land here).
  const linked = params?.slug;
  useEffect(() => {
    if (linked && (HELP_VIDEO_BY_SLUG[linked] || findChapterParent(linked))) openHelpVideo(linked);
  }, [linked]);

  // Phone recordings play through their main card, and the vendor tour lives on the vendor portal only.
  const visible = useMemo(() => HELP_VIDEOS.filter(video => !video.phoneVersion && video.audience !== "vendor" && canWatchHelpVideo(video, viewer)),
    [viewer.loggedIn, viewer.organiser, viewer.reshipper, viewer.poolLeader, viewer.wholesaleEnabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = query.trim().toLowerCase();
  const results = useMemo(() => !q ? [] : visible.filter(video => [video.title, video.summary, ...video.keywords].some(value => value.toLowerCase().includes(q))), [q, visible]);
  const inCategories = (categories: HelpVideoCategory[]) => visible.filter(video => categories.includes(video.category));
  const sections = SECTIONS.map(section => ({
    ...section,
    videos: inCategories(section.categories).filter(video => (!section.only || section.only.includes(video.slug)) && !section.except?.includes(video.slug))
      .sort((a, b) => (section.only ? section.only.indexOf(a.slug) - section.only.indexOf(b.slug) : 0)),
  })).filter(section => section.videos.length > 0);
  const faq = inCategories(["Common questions"]);
  // A member who already holds a role gets that role's whole series under "Your tools", starting with part 1.
  const heldIntros = [viewer.organiser && ROLE_INTRO.organiser, viewer.poolLeader && ROLE_INTRO.poolLeader, viewer.reshipper && ROLE_INTRO.reshipper].filter(Boolean) as string[];
  const roles = viewer.loggedIn ? inCategories(["Get involved"]).filter(video => !heldIntros.includes(video.slug) && !(viewer.reshipper && video.slug === "becoming-a-reshipper")) : [];
  const TOOL_ORDER = ["organiser-1-create", "organiser-2-orders", "organiser-3-dispatch", "organiser-4-tools", "pool-leader", "pool-leader-2-options", "reshippers", "reshippers-2-qr-and-box-checks"];
  const tools = visible.filter(video => video.category === "Your tools" || heldIntros.includes(video.slug)).sort((a, b) => TOOL_ORDER.indexOf(a.slug) - TOOL_ORDER.indexOf(b.slug));
  const toolTitle = (video: HelpVideo) => video.slug === "pool-leader" ? "Pool leader 1: running a pool" : video.slug === "reshippers" ? "Reshippers 1: the full guide" : video.title;
  const cryptoStart = HELP_VIDEO_BY_SLUG[cryptoGuideSlug((readCryptoChoice() ?? { exchange: "coinbase" }).exchange, (readCryptoChoice() ?? { wallet: "exodus" }).wallet)];
  const jump = (id: string) => document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const topics = [{ id: "crypto", title: "Paying" }, ...sections.map(section => ({ id: section.id, title: section.id === "group-buys" ? "Group buys" : section.title })),
    ...(faq.length ? [{ id: "questions", title: "Common questions" }] : []), ...(roles.length ? [{ id: "get-involved", title: "Get involved" }] : []), ...(tools.length ? [{ id: "tools", title: "Your tools" }] : [])];
  const heldRoles = [viewer.organiser && "organisers", viewer.poolLeader && "pool leaders", viewer.reshipper && "reshippers"].filter(Boolean) as string[];
  const toolsPill = heldRoles.length > 1 ? `${heldRoles.slice(0, -1).join(", ")} and ${heldRoles[heldRoles.length - 1]}` : heldRoles[0] ?? "";

  return (
    <ResearchShell active="help">
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-11 px-4 py-8 sm:px-6 sm:py-10" data-testid="help-page">
          <header className="flex flex-col gap-4">
            <div>
              <h1 className="m-0 text-[30px] font-bold" style={{ color: text, letterSpacing: "-0.01em" }}>Help and video guides</h1>
              <p className="mt-1.5 text-[15px]" style={{ color: muted }}>Short videos that show you each part of the site, step by step.</p>
            </div>
            <label className="flex h-[52px] items-center gap-2.5 px-4" style={{ background: surface, border, borderRadius: 14 }}>
              <Search className="h-[18px] w-[18px] shrink-0" style={{ color: subtle }} />
              <span className="sr-only">Search the guides</span>
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={'What do you need help with? Try "transaction hash" or "QR code"'}
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none" style={{ color: text }} data-testid="help-search" />
            </label>
            {!q && <div className="flex flex-wrap gap-2">
              {topics.map(topic => <button key={topic.id} type="button" onClick={() => jump(topic.id)} className="rounded-full px-3.5 py-2.5 text-[13px] font-semibold"
                style={{ background: surface, border, color: NAVY }}>{topic.title}</button>)}
            </div>}
          </header>

          {q ? (
            <section data-testid="help-section-results">
              <SectionHeading title={`${results.length} result${results.length === 1 ? "" : "s"} for "${query.trim()}"`} />
              {results.length ? <div style={cardGrid}>{results.map(video => <VideoCard key={video.slug} video={video} />)}</div>
                : <p className="text-[14px]" style={{ color: muted }}>No video matches that yet. Try a different word, or use the buttons under "Still stuck?" below.</p>}
            </section>
          ) : <>
            <section aria-label="Start here" data-testid="help-section-start">
              <h2 className="mb-3.5 text-[13px] font-bold uppercase" style={{ color: subtle, letterSpacing: "0.08em" }}>Start here</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                <VideoCard video={HELP_VIDEO_BY_SLUG["dashboard"]} large />
                <VideoCard video={HELP_VIDEO_BY_SLUG["ordering-and-paying"]} large />
                {cryptoStart && <VideoCard video={cryptoStart} large title="Paying with crypto" summary="Never used crypto? Start here. Buy, move and pay." onOpen={() => jump("crypto")} />}
              </div>
            </section>

            <CryptoSection />

            {sections.map(section => (
              <section key={section.id} id={`help-${section.id}`} className="scroll-mt-24" data-testid={`help-section-${section.id}`}>
                <SectionHeading title={section.title} note={section.note} />
                <div style={cardGrid}>{section.videos.map(video => <VideoCard key={video.slug} video={video} />)}</div>
              </section>
            ))}

            {faq.length > 0 && (
              <section id="help-questions" className="scroll-mt-24" data-testid="help-section-questions">
                <SectionHeading title="Common questions" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  {faq.map(video => (
                    <button key={video.slug} type="button" onClick={() => openHelpVideo(video.slug)} data-testid={`help-card-${video.slug}`}
                      className="flex items-center gap-3.5 px-4 py-3.5 text-left transition-shadow hover:shadow-md" style={{ background: surface, border, borderRadius: 14 }}>
                      <PlayDisc size={36} tone="soft" />
                      <span className="flex-1 text-[15px] font-semibold" style={{ color: text }}>{faqTitle(video)}</span>
                      <span className="text-[13px] tabular-nums" style={{ color: subtle }}>{video.length}</span>
                    </button>))}
                </div>
              </section>
            )}

            {roles.length > 0 && (
              <section id="help-get-involved" className="flex scroll-mt-24 flex-col gap-[18px] p-5 sm:p-7" style={{ background: "#1B3A7A", borderRadius: 20 }} data-testid="help-section-get-involved">
                <div>
                  <h2 className="m-0 text-[22px] font-bold text-white">Get involved</h2>
                  <p className="mt-1.5 text-[14px]" style={{ color: "#DCE6F7", lineHeight: 1.5 }}>Want to run a group buy, lead a testing pool, reship for your country or sell your vials? Watch what each role involves, then apply.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
                  {roles.map(video => (
                    <div key={video.slug} className="flex flex-col gap-2.5 p-4" style={{ background: surface, borderRadius: 14 }} data-testid={`help-card-${video.slug}`}>
                      <div className="text-[15px] font-bold" style={{ color: text }}>{ROLE_CARD[video.slug]?.title ?? video.title}</div>
                      <div className="flex-1 text-[13px]" style={{ color: muted, lineHeight: 1.4 }}>{video.summary}</div>
                      <button type="button" onClick={() => openHelpVideo(video.slug)} className="h-11 rounded-[10px] text-[13px] font-bold" style={{ background: SOFT_BLUE, color: NAVY }}>Watch {video.length}</button>
                      {video.applyHref && <button type="button" onClick={() => navigate(video.applyHref!)} className="py-1.5 text-center text-[13px] font-semibold underline-offset-2 hover:underline" style={{ color: "var(--t-blue)" }}>{ROLE_CARD[video.slug]?.apply ?? "Apply"}</button>}
                    </div>))}
                </div>
              </section>
            )}

            {tools.length > 0 && (
              <section id="help-tools" className="scroll-mt-24" data-testid="help-section-tools">
                <SectionHeading title="Your tools" pill={toolsPill ? `Only ${toolsPill} see this` : undefined} />
                <div style={cardGrid}>{tools.map(video => <VideoCard key={video.slug} video={video} title={toolTitle(video)} />)}</div>
              </section>
            )}

            {!viewer.loggedIn && (
              <button type="button" onClick={() => navigate("/login")} className="flex w-full items-center gap-3.5 p-5 text-left" style={{ background: surface, border, borderRadius: 20 }} data-testid="help-login-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: SOFT_BLUE, color: NAVY }}><Lock className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold" style={{ color: text }}>Log in to see more guides</span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: muted }}>Members also get guides on shared orders, wholesale, and becoming an organiser, reshipper, pool leader or seller.</span>
                </span>
                <span className="hidden h-11 shrink-0 items-center rounded-xl px-5 text-[14px] font-bold text-white sm:inline-flex" style={{ background: "#1B3A7A" }}>Log in</span>
              </button>
            )}
          </>}

          <section aria-label="Still stuck" className="flex flex-wrap items-center gap-5 p-5 sm:p-7" style={{ background: surface, border, borderRadius: 20 }} data-testid="help-section-stuck">
            <div className="min-w-0" style={{ flex: "1 1 280px" }}>
              <h2 className="m-0 text-[20px] font-bold" style={{ color: text }}>Still stuck?</h2>
              <p className="mt-1.5 text-[14px]" style={{ color: muted }}>Open a ticket and the team will reply, or ask Sage to find the right video.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => navigate("/account?s=support")} className="inline-flex h-12 items-center rounded-xl px-[22px] text-[14px] font-bold text-white" style={{ background: "#1B3A7A" }} data-testid="help-open-ticket">Open a support ticket</button>
              <button type="button" onClick={() => navigate("/sage")} className="inline-flex h-12 items-center rounded-xl px-[22px] text-[14px] font-bold" style={{ background: surface, border, color: NAVY }} data-testid="help-ask-sage">Ask Sage</button>
            </div>
          </section>
        </main>
      </div>
    </ResearchShell>
  );
}
