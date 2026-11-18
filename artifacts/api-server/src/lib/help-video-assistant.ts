import { HELP_VIDEOS, HELP_VIDEO_BY_SLUG, type HelpVideo } from "../../../peps-anonymous/src/data/help-videos";

/* ---------------------------------------------------------------------------
 * Guide videos for the two assistants: Sage (website chat) and the Telegram
 * support bot. Pure helpers only: this file imports nothing but the shared
 * video list, so it can be tested without a database.
 * ------------------------------------------------------------------------- */

const MAX_SAGE_VIDEOS = 2;

/** One line per video: slug, title, summary and the words to match on. */
function videoLines(videos: HelpVideo[]): string {
  return videos
    .map(video => `- ${video.slug} | ${video.title} | ${video.summary} | keywords: ${video.keywords.join(", ")}`)
    .join("\n");
}

// ── Sage ─────────────────────────────────────────────────────────────────────

/**
 * The videos Sage may offer, out of the ones this viewer is allowed to watch.
 * Phone recordings are the same video again and vendor videos belong to the
 * vendor portal, so neither is offered in the member chat.
 */
export function sageHelpVideos(visibleToViewer: HelpVideo[]): HelpVideo[] {
  return visibleToViewer.filter(video => !video.phoneVersion && video.audience !== "vendor");
}

/**
 * Appended to Sage's system prompt in code, so it applies whatever the
 * admin-edited prompt template says.
 */
export function buildSageHelpVideoBlock(videos: HelpVideo[]): string {
  const list = videos.length > 0 ? videoLines(videos) : "(no guide videos are available for this member)";
  return `─── SALT&PEPS SITE HELP: GUIDE VIDEOS ───
This section replaces any earlier instruction to refuse questions about using the Salt&Peps site or to send the member to "contact the team" for them. Every other rule above stays as it is.

When the question is about using the Salt&Peps site (ordering, checkout, paying, crypto payments, group buys, batches, kit limits, half kits, tracking, support tickets, QR codes, the dashboard, the Telegram bot, testing pools, account tools and similar):
- Do not answer from your own knowledge. Reply in one or two sentences only.
- Offer the matching guide video or videos from the list below using the VIDEOS_JSON block, and mention that the member can open a support ticket if they still need help.
- Never explain payment steps, prices or order status in your own words.
- If no video in the list matches, say so, and point the member to the Help page (/help) and to support tickets.
- For crypto payment questions, pick the guide that matches the member's exchange and wallet. If it is not clear which exchange or wallet they use, ask them which before offering a guide.
- Only use slugs that appear in the list below, written exactly as shown. Never invent a slug.
- Health, compound and blood-test questions are answered as normal, with no video.

GUIDE VIDEOS (slug | title | summary | keywords):
${list}

Video block format. When you offer a video, output this block on a new line at the very end of your response, after all other blocks:
  VIDEOS_JSON_START["slug-one","slug-two"]VIDEOS_JSON_END
Rules for videos: a JSON array of slugs from the list above; at most ${MAX_SAGE_VIDEOS} videos, most relevant first. The member sees each one as a card they can tap to watch, so do not write the slug or a link in your text. If no video applies, output VIDEOS_JSON_START[]VIDEOS_JSON_END or leave the block out.
─── END GUIDE VIDEOS ───`;
}

const VIDEOS_RE = /VIDEOS?_?JSON_?START(\[[\s\S]*?\])VIDEOS?_?JSON_?END/;
const VIDEOS_RE_ALL = new RegExp(VIDEOS_RE.source, "g");

/** Pulls the VIDEOS_JSON block out of a raw Sage reply. The slugs are not yet checked. */
export function extractVideoSlugs(raw: string): { text: string; slugs: string[] } {
  const match = raw.match(VIDEOS_RE);
  let slugs: string[] = [];
  if (match) {
    try { slugs = JSON.parse(match[1]) as string[]; } catch { slugs = []; }
    if (!Array.isArray(slugs)) slugs = [];
    slugs = slugs.filter((slug): slug is string => typeof slug === "string" && slug.trim().length > 0).map(slug => slug.trim());
  }
  return { text: raw.replace(VIDEOS_RE_ALL, ""), slugs };
}

/** Keeps only slugs this viewer may be offered, without repeats, two at most. */
export function filterVideoSlugs(slugs: string[], allowed: HelpVideo[]): string[] {
  const allowedSlugs = new Set(allowed.map(video => video.slug));
  return [...new Set(slugs)].filter(slug => allowedSlugs.has(slug)).slice(0, MAX_SAGE_VIDEOS);
}

// ── Telegram support bot ─────────────────────────────────────────────────────

/**
 * The bot cannot tell who it is talking to, so it only ever offers videos that
 * anyone may watch: public, not wholesale, and not the phone recordings.
 */
export function telegramHelpVideos(): HelpVideo[] {
  return HELP_VIDEOS.filter(video => video.audience === "public" && !video.wholesale && !video.phoneVersion);
}

/** Appended to the Telegram support bot's instructions in code. */
export function buildTelegramHelpVideoBlock(videos: HelpVideo[] = telegramHelpVideos()): string {
  if (videos.length === 0) return "";
  return `Guide videos:
- If one of the guide videos below matches the question, keep your answer short and finish your reply with one final line, on its own, in exactly this form: VIDEO: <slug>
- Use one video at most, and only a slug from the list below, written exactly as shown. Never invent a slug and never write a link yourself; the link is added for you.
- If no video matches, do not add a VIDEO line.
- For crypto payment questions, pick the guide that matches the customer's exchange and wallet. If that is not clear, ask which exchange and wallet they use and do not add a VIDEO line yet.

GUIDE VIDEOS (slug | title | summary | keywords):
${videoLines(videos)}`;
}

const VIDEO_MARKER_LINE_RE = /^[ \t]*VIDEO[ \t]*:[ \t]*<?([A-Za-z0-9-]*)>?[ \t.]*$/i;

/**
 * Replaces the bot's "VIDEO: <slug>" marker with one final line holding the
 * video title and its link on the site. Marker lines with a slug that is not
 * in the allowed list are dropped, and only the first valid one is kept.
 */
export function applyTelegramVideoMarker(reply: string, siteUrl: string, videos: HelpVideo[] = telegramHelpVideos()): string {
  const allowedSlugs = new Set(videos.map(video => video.slug));
  let slug: string | null = null;
  const kept: string[] = [];
  for (const line of reply.split(/\r?\n/)) {
    const match = line.match(VIDEO_MARKER_LINE_RE);
    if (!match) { kept.push(line); continue; }
    const candidate = match[1].toLowerCase();
    if (!slug && allowedSlugs.has(candidate)) slug = candidate;
  }
  const text = kept.join("\n").trim();
  if (!slug) return text;
  const link = `${HELP_VIDEO_BY_SLUG[slug].title}: ${siteUrl.replace(/\/+$/, "")}/help/${slug}`;
  return text ? `${text}\n\n${link}` : link;
}
