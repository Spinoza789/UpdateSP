import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuideVideoPlayer, formatVideoTime } from "./GuideVideoPlayer";

Object.assign(globalThis, { React });

test("uses inline playback with accessible custom controls instead of native controls", () => {
  const html = renderToStaticMarkup(<GuideVideoPlayer src="/guide.mp4" label="Group guide" />);
  assert.match(html, /playsInline=""/);
  assert.doesNotMatch(html, / controls=|autoPlay=/);
  assert.match(html, /aria-label="Play video"/);
  assert.match(html, /aria-label="Seek video"/);
  assert.match(html, /aria-label="Mute video"/);
  assert.match(html, /src="\/guide.mp4"/);
});

test("formats valid and not-yet-loaded playback times", () => {
  assert.equal(formatVideoTime(115.5), "1:55");
  assert.equal(formatVideoTime(0), "0:00");
  assert.equal(formatVideoTime(NaN), "0:00");
  assert.equal(formatVideoTime(Infinity), "0:00");
});
