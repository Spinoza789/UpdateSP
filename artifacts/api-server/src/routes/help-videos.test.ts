import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";

vi.mock("@workspace/db", () => ({ db: {}, accountsTable: {} }));
vi.mock("../middleware/account-auth", () => ({ getOptionalAccountSession: async () => null }));
vi.mock("../middleware/vendor-auth", () => ({ requireVendorAccount: (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => res.status(401).json({}) }));
vi.mock("./config", () => ({ getConfigValue: async () => "true" }));

const { createHelpVideosRouter } = await import("./help-videos");
type Viewer = { loggedIn: boolean; organiser: boolean; reshipper: boolean; poolLeader: boolean; vendor?: boolean; wholesaleEnabled: boolean };
const dir = mkdtempSync(join(tmpdir(), "help-videos-test-"));
const bytes = Buffer.from("0123456789abcdefghij");
let viewer: Viewer = { loggedIn: false, organiser: false, reshipper: false, poolLeader: false, wholesaleEnabled: true };
let base = ""; let server: ReturnType<express.Express["listen"]>; let downloads = 0;

beforeAll(async () => {
  mkdirSync(join(dir, "cache"));
  const app = express();
  app.use("/api", createHelpVideosRouter({
    local: () => null, cacheDir: join(dir, "cache"), viewer: async () => ({ ...viewer }),
    download: async (key, path) => {
      downloads++;
      if (key === "help-videos/half-kits.mp4" || key === "help-videos/organiser-2-orders.mp4" || key === "help-videos/shared-orders.mp4") { writeFileSync(path, bytes); return; }
      throw Object.assign(new Error("missing"), { statusCode: 404 });
    },
  }));
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/help-videos`;
});
afterAll(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

describe("help video streaming", () => {
  it("streams a public video with range support and a long public cache, downloading it once", async () => {
    const full = await fetch(`${base}/half-kits`);
    expect(full.status).toBe(200);
    expect(full.headers.get("content-type")).toContain("video/mp4");
    expect(full.headers.get("cache-control")).toBe("public, max-age=604800");
    expect(Buffer.from(await full.arrayBuffer()).equals(bytes)).toBe(true);
    const part = await fetch(`${base}/half-kits`, { headers: { Range: "bytes=5-9" } });
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 5-9/20");
    expect(await part.text()).toBe("56789");
    expect(downloads).toBe(1);
  });
  it("answers a real 404 for unknown slugs and for known videos that are not uploaded", async () => {
    for (const slug of ["no-such-video", "Half-Kits", "..%2Fsecret", "batch-system"]) {
      const response = await fetch(`${base}/${slug}`);
      expect(response.status, slug).toBe(404);
      expect(response.headers.get("content-type"), slug).toContain("application/json");
    }
    expect((await fetch(`${base}/half-kits/poster`)).status).toBe(404);
  });
  it("refuses role and member videos to people without that access", async () => {
    viewer = { loggedIn: false, organiser: false, reshipper: false, poolLeader: false, wholesaleEnabled: true };
    expect((await fetch(`${base}/organiser-2-orders`)).status).toBe(401);
    expect((await fetch(`${base}/shared-orders`)).status).toBe(401);
    viewer = { ...viewer, loggedIn: true };
    expect((await fetch(`${base}/organiser-2-orders`)).status).toBe(403);
    expect((await fetch(`${base}/vendor-portal`)).status).toBe(403);
    const member = await fetch(`${base}/shared-orders`);
    expect(member.status).toBe(200);
    expect(member.headers.get("cache-control")).toBe("private, max-age=86400");
    viewer = { ...viewer, wholesaleEnabled: false };
    expect((await fetch(`${base}/shared-orders`)).status).toBe(403);
    viewer = { ...viewer, organiser: true };
    expect((await fetch(`${base}/organiser-2-orders`)).status).toBe(200);
  });
});
