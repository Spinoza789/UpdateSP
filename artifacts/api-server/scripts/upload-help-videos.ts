/**
 * Uploads the guide videos to App Storage as help-videos/<slug>.mp4, with a poster
 * image help-videos/<slug>.jpg taken from an early frame of each video.
 *
 * Run it inside Replit (it needs App Storage), from artifacts/api-server:
 *   pnpm exec tsx scripts/upload-help-videos.ts [path-to-salt-peps-videos-latest] [--dry-run] [--only=<slug>]
 *
 * - The folder must contain videos.json (slug -> file). Default: ../../salt-peps-videos-latest.
 * - Videos are uploaded as they are: never re-encoded, cropped or edited.
 * - Posters need ffmpeg on the PATH. Without it the videos still upload and the
 *   site shows its plain placeholder card instead of a poster.
 * - Replacing a video later: put the new file in the folder under the same slug and run
 *   this again with --only=<slug>. Running servers keep their cached copy until they restart.
 */
import { Client } from "@replit/object-storage";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

type Entry = { slug: string; file: string; chapters?: Entry[] };
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.find(arg => arg.startsWith("--only="))?.slice("--only=".length);
const dir = resolve(args.find(arg => !arg.startsWith("--")) ?? "../../salt-peps-videos-latest");
if (!existsSync(join(dir, "videos.json"))) {
  console.error(`No videos.json in ${dir}. Pass the path to the salt-peps-videos-latest folder.`);
  process.exit(1);
}
const list = JSON.parse(readFileSync(join(dir, "videos.json"), "utf8")) as { videos: Entry[] };
const entries = list.videos.flatMap(video => [video, ...(video.chapters ?? [])]).filter(entry => !only || entry.slug === only);
const slugs = new Set<string>();
for (const entry of entries) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) || slugs.has(entry.slug)) { console.error(`Bad or repeated slug: ${entry.slug}`); process.exit(1); }
  if (!existsSync(join(dir, entry.file))) { console.error(`Missing file for ${entry.slug}: ${entry.file}`); process.exit(1); }
  slugs.add(entry.slug);
}
if (!entries.length) { console.error(only ? `No video with slug ${only}.` : "videos.json lists no videos."); process.exit(1); }

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
if (!hasFfmpeg) console.warn("ffmpeg not found: uploading videos without poster images.");
const posterDir = join(dir, "posters");
mkdirSync(posterDir, { recursive: true });
/** First clear frame: a moment in, past any fade from black. The source video is only read. */
function makePoster(entry: Entry): string | null {
  const out = join(posterDir, `${entry.slug}.jpg`);
  if (existsSync(out)) return out;
  if (!hasFfmpeg) return null;
  const result = spawnSync("ffmpeg", ["-y", "-ss", "2", "-i", join(dir, entry.file), "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", out], { stdio: "ignore" });
  return result.status === 0 && existsSync(out) ? out : null;
}

const client = dryRun ? null : new Client();
let videos = 0, posters = 0, bytes = 0;
for (const entry of entries) {
  const source = join(dir, entry.file);
  const size = statSync(source).size;
  const poster = makePoster(entry);
  if (client) {
    const uploaded = await client.uploadFromFilename(`help-videos/${entry.slug}.mp4`, source, { compress: false });
    if (!uploaded.ok) { console.error(`Upload failed for ${entry.slug}: ${uploaded.error.message}`); process.exit(1); }
    if (poster) {
      const image = await client.uploadFromFilename(`help-videos/${entry.slug}.jpg`, poster, { compress: false });
      if (!image.ok) { console.error(`Poster upload failed for ${entry.slug}: ${image.error.message}`); process.exit(1); }
    }
  }
  videos++; bytes += size; if (poster) posters++;
  console.log(`${dryRun ? "would upload" : "uploaded"} help-videos/${entry.slug}.mp4 (${(size / 1048576).toFixed(1)} MB)${poster ? " + poster" : ""}`);
}
console.log(`${dryRun ? "Dry run: " : ""}${videos} videos (${(bytes / 1048576).toFixed(0)} MB), ${posters} posters.`);
