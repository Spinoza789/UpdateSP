import { afterAll, beforeAll, expect, it, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { writeFile } from "node:fs/promises";
import { createHghBatchGuideRouter } from "./hgh-batch-guide";

let server: Server;
let base: string;
const bytes = Buffer.from("fixture-video-with-range-support");
const download = vi.fn(async (key: string, path: string) => {
  expect([
    "tutorials/hgh-batch-system-1794492512994.mp4",
    "tutorials/uther-gb-1794501095044.mp4",
  ]).toContain(key);
  await writeFile(path, bytes);
});

beforeAll(async () => {
  const app = express();
  app.use(createHghBatchGuideRouter(download));
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

it("serves the stored video and supports seeking with byte ranges", async () => {
  const response = await fetch(base + "/group-buys/UAJBM/batch-guide.mp4");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("video/mp4");
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  const range = await fetch(base + "/group-buys/UAJBM/batch-guide.mp4", { headers: { Range: "bytes=8-12" } });
  expect(range.status).toBe(206);
  expect(range.headers.get("content-range")).toBe(`bytes 8-12/${bytes.length}`);
  expect(Buffer.from(await range.arrayBuffer())).toEqual(bytes.subarray(8, 13));
  expect(download).toHaveBeenCalledTimes(1);
});

it("does not serve a guide for any other group", async () => {
  expect((await fetch(base + "/group-buys/VZE6X/batch-guide.mp4")).status).toBe(404);
});

it("serves the Uther group's own video without reusing the HGH cache", async () => {
  const response = await fetch(base + "/group-buys/5ZZ87/batch-guide.mp4", { headers: { Range: "bytes=0-4" } });
  expect(response.status).toBe(206);
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes.subarray(0, 5));
  expect(download).toHaveBeenCalledWith("tutorials/uther-gb-1794501095044.mp4", expect.any(String));
});

it("reports a storage failure and allows a later request to retry", async () => {
  const failing = vi.fn().mockRejectedValueOnce(new Error("Storage unavailable"))
    .mockImplementation(async (_key: string, path: string) => { await writeFile(path, bytes); });
  const app = express();
  app.use(createHghBatchGuideRouter(failing));
  const temporaryServer = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => temporaryServer.once("listening", resolve));
  const url = `http://127.0.0.1:${(temporaryServer.address() as { port: number }).port}/group-buys/UAJBM/batch-guide.mp4`;
  try {
    const failed = await fetch(url);
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ error: "The batch guide is temporarily unavailable. Please try again." });
    expect((await fetch(url)).status).toBe(200);
    expect(failing).toHaveBeenCalledTimes(2);
  } finally {
    temporaryServer.closeAllConnections();
    await new Promise<void>(resolve => temporaryServer.close(() => resolve()));
  }
});
