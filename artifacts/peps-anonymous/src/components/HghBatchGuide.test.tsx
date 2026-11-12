import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { HghBatchGuide } from "./HghBatchGuide";

Object.assign(globalThis, { React });

test("shows a controlled, non-autoplay batch tutorial only for the exact HGH group", () => {
  const html = renderToStaticMarkup(<HghBatchGuide groupBuyId="UAJBM" />);
  assert.match(html, /How the batch system works/);
  assert.match(html, /<details/);
  assert.match(html, /<video/);
  assert.match(html, /controls=""/);
  assert.match(html, /preload="none"/);
  assert.match(html, /playsInline=""/);
  assert.match(html, /\/api\/group-buys\/UAJBM\/batch-guide\.mp4/);
  assert.doesNotMatch(html, /autoPlay|autoplay/);
});

test("never shows the video for other groups, including other HGH group buys", () => {
  for (const groupBuyId of [undefined, null, "", "VZE6X", "U6ZLB", "OTHER", "HGH 36IU"]) {
    assert.equal(renderToStaticMarkup(<HghBatchGuide groupBuyId={groupBuyId} />), "");
  }
});

test("the guide is installed on the order form", () => {
  const source = readFileSync(new URL("../pages/OrderForm.tsx", import.meta.url), "utf8");
  assert.match(source, /<HghBatchGuide groupBuyId=\{gbId\}/);
});
