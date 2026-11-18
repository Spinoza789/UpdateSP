import { Router, type Request, type Response } from "express";
import { Client } from "@replit/object-storage";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, accountsTable } from "@workspace/db";
import { getOptionalAccountSession } from "../middleware/account-auth";
import { requireVendorAccount } from "../middleware/vendor-auth";
import { getConfigValue } from "./config";
import {
  HELP_VIDEO_AUDIENCE, HELP_VIDEO_BY_SLUG, HELP_VIDEOS, canWatchHelpVideo, type HelpVideo, type HelpViewer,
} from "../../../peps-anonymous/src/data/help-videos";

/* ---------------------------------------------------------------------------
 * Guide videos for the Help page, the "Watch" links, Sage and the Telegram bot.
 *
 * Durable source is App Storage: help-videos/<slug>.mp4 and help-videos/<slug>.jpg.
 * Each object is downloaded once into a local cache so sendFile can answer Range
 * requests (seeking) natively. In development, HELP_VIDEOS_DIR (or the
 * salt-peps-videos-latest folder at the repo root) is read directly instead.
 * ------------------------------------------------------------------------- */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Kind = "mp4" | "jpg";

/** slug -> path inside the local videos folder, from its videos.json. */
function localSource(): { dir: string; files: Record<string, string> } | null {
  const candidates = [process.env["HELP_VIDEOS_DIR"], resolve(process.cwd(), "../../salt-peps-videos-latest"), resolve(process.cwd(), "salt-peps-videos-latest")];
  for (const dir of candidates) {
    if (!dir || !existsSync(join(dir, "videos.json"))) continue;
    try {
      const list = JSON.parse(readFileSync(join(dir, "videos.json"), "utf8")) as { videos: Array<{ slug: string; file: string; chapters?: Array<{ slug: string; file: string }> }> };
      const files: Record<string, string> = {};
      for (const video of list.videos) {
        files[video.slug] = video.file;
        for (const chapter of video.chapters ?? []) files[chapter.slug] = chapter.file;
      }
      return { dir, files };
    } catch { /* fall through to App Storage */ }
  }
  return null;
}

async function downloadFromStorage(key: string, path: string) {
  const result = await new Client().downloadToFilename(key, path, { decompress: false });
  if (!result.ok) throw Object.assign(new Error(result.error.message), { statusCode: result.error.statusCode });
}

export type HelpVideoDeps = {
  download?: (key: string, path: string) => Promise<void>;
  local?: () => { dir: string; files: Record<string, string> } | null;
  viewer?: (req: Request) => Promise<HelpViewer>;
  cacheDir?: string;
};

/** Who is asking, resolved from the member and vendor session cookies. */
export async function helpViewerForRequest(req: Request): Promise<HelpViewer> {
  const wholesaleEnabled = (await getConfigValue("wholesale_access_enabled").catch(() => null)) === "true";
  const viewer: HelpViewer = { loggedIn: false, organiser: false, reshipper: false, poolLeader: false, vendor: false, wholesaleEnabled };
  const session = await getOptionalAccountSession(req).catch(() => null);
  if (session) {
    viewer.loggedIn = true;
    const [account] = await db.select({
      organiser: accountsTable.organiserStatus, reshipper: accountsTable.reshipperStatus, poolLeader: accountsTable.poolLeaderStatus,
    }).from(accountsTable).where(eq(accountsTable.telegramUsername, session.telegramUsername));
    viewer.organiser = account?.organiser === "approved";
    viewer.reshipper = account?.reshipper === "approved";
    viewer.poolLeader = account?.poolLeader === "approved";
  }
  return viewer;
}
/** True when the request carries a live, active vendor session. */
function hasVendorSession(req: Request): Promise<boolean> {
  return new Promise(done => {
    const res = { status() { return this; }, json() { done(false); return this; }, set() { return this; }, clearCookie() { return this; } } as unknown as Response;
    Promise.resolve(requireVendorAccount(req, res, () => done(true))).catch(() => done(false));
  });
}

export function helpVideosVisibleTo(viewer: HelpViewer): HelpVideo[] {
  return HELP_VIDEOS.filter(video => canWatchHelpVideo(video, viewer));
}

export function createHelpVideosRouter(deps: HelpVideoDeps = {}) {
  const router = Router();
  const download = deps.download ?? downloadFromStorage;
  const local = (deps.local ?? localSource)();
  const cacheDir = deps.cacheDir ?? join(tmpdir(), "help-videos-cache");
  const inFlight = new Map<string, Promise<string>>();

  /** Absolute path of the file for this slug, or null when it does not exist anywhere. */
  async function fileFor(slug: string, kind: Kind): Promise<string | null> {
    if (local) {
      const path = kind === "mp4" ? (local.files[slug] ? join(local.dir, local.files[slug]) : null) : join(local.dir, "posters", `${slug}.jpg`);
      return path && existsSync(path) ? path : null;
    }
    const name = `${slug}.${kind}`;
    const target = join(cacheDir, name);
    if (existsSync(target)) return target;
    let pending = inFlight.get(name);
    if (!pending) {
      pending = (async () => {
        await mkdir(cacheDir, { recursive: true });
        const partial = `${target}.${process.pid}.${Date.now()}.part`;
        try {
          await download(`help-videos/${name}`, partial);
          if ((await stat(partial)).size === 0) throw Object.assign(new Error("Empty object"), { statusCode: 404 });
          await rename(partial, target);
          return target;
        } catch (error) {
          await rm(partial, { force: true });
          throw error;
        }
      })().finally(() => inFlight.delete(name));
      inFlight.set(name, pending);
    }
    try { return await pending; }
    catch (error) {
      if ((error as { statusCode?: number })?.statusCode === 404) return null;
      throw error;
    }
  }

  async function serve(req: Request, res: Response, kind: Kind) {
    const slug = String(req.params["slug"] ?? "");
    const audience = SLUG.test(slug) ? HELP_VIDEO_AUDIENCE[slug] : undefined;
    // An unknown slug is a real 404, never the site's HTML page.
    if (!audience) { res.status(404).json({ error: "Video not found." }); return; }
    const parent = HELP_VIDEO_BY_SLUG[slug] ?? HELP_VIDEOS.find(video => video.chapters?.some(chapter => chapter.slug === slug))!;
    if (audience !== "public" || parent.wholesale) {
      const viewer = await (deps.viewer ?? helpViewerForRequest)(req);
      if (audience === "vendor") viewer.vendor = await hasVendorSession(req);
      if (!canWatchHelpVideo(parent, viewer)) {
        res.status(viewer.loggedIn || viewer.vendor ? 403 : 401).json({ error: "You are not allowed to watch this video." });
        return;
      }
    }
    let path: string | null;
    try { path = await fileFor(slug, kind); }
    catch (error) {
      console.error("[help-videos] could not load", slug, error instanceof Error ? error.message : "unknown error");
      res.status(503).json({ error: "This video is temporarily unavailable. Please try again." });
      return;
    }
    if (!path) { res.status(404).json({ error: kind === "mp4" ? "Video not found." : "Poster not found." }); return; }
    res.type(kind === "mp4" ? "video/mp4" : "image/jpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Public files may sit in shared caches; restricted ones only in the member's browser.
    res.setHeader("Cache-Control", audience === "public" && !parent.wholesale ? "public, max-age=604800" : "private, max-age=86400");
    res.sendFile(path, { dotfiles: "allow", cacheControl: false }, error => {
      if (error && !res.headersSent) res.status(500).json({ error: "Could not play this video." });
    });
  }

  router.get("/help-videos/:slug", (req, res, next) => { serve(req, res, "mp4").catch(next); });
  router.get("/help-videos/:slug/poster", (req, res, next) => { serve(req, res, "jpg").catch(next); });
  return router;
}

export default createHelpVideosRouter();
