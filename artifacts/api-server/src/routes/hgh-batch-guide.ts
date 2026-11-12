import { Router } from "express";
import { Client } from "@replit/object-storage";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VIDEO_KEY = "tutorials/hgh-batch-system-1794492512994.mp4";

async function downloadGuide(key: string, path: string) {
  const result = await new Client().downloadToFilename(key, path, { decompress: false });
  if (!result.ok) throw new Error(result.error.message);
}

/**
 * Durable source is App Storage. A single local cache avoids downloading the
 * entire object for each seek; sendFile streams it with native Range support.
 * The public educational video contains no member/order data.
 */
export function createHghBatchGuideRouter(download = downloadGuide) {
  const router = Router();
  let cached: Promise<string> | undefined;
  async function cachedVideo() {
    const dir = await mkdtemp(join(tmpdir(), "hgh-batch-guide-"));
    const path = join(dir, "batch-guide.mp4");
    try {
      await download(VIDEO_KEY, path);
      return path;
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      throw error;
    }
  }
  router.get("/group-buys/UAJBM/batch-guide.mp4", async (_req, res, next) => {
    let path: string;
    try {
      cached ??= cachedVideo().catch(error => { cached = undefined; throw error; });
      path = await cached;
    } catch {
      res.setHeader("Cache-Control", "no-store");
      res.status(503).json({ error: "The batch guide is temporarily unavailable. Please try again." });
      return;
    }
    res.type("video/mp4");
    res.sendFile(path, { maxAge: "1d", cacheControl: true }, error => {
      if (error) next(error);
    });
  });
  return router;
}

export default createHghBatchGuideRouter();
