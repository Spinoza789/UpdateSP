import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { HghBatchGuide } from "./HghBatchGuide";

Object.assign(globalThis, { React });

test("shows a pill that opens the batch guide only for the exact HGH group", () => {
  const html = renderToStaticMarkup(<HghBatchGuide groupBuyId="UAJBM" />);
  assert.match(html, /How the batch system works/);
  assert.match(html, /Batch guide/);
  assert.match(html, /rounded-full/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /<details|<video/);
});

test("never shows the video for other groups, including other HGH group buys", () => {
  for (const groupBuyId of [undefined, null, "", "VZE6X", "U6ZLB", "OTHER", "HGH 36IU"]) {
    assert.equal(renderToStaticMarkup(<HghBatchGuide groupBuyId={groupBuyId} />), "");
  }
});

test("shows the Uther guide only for its explicitly selected group", () => {
  const html = renderToStaticMarkup(<HghBatchGuide groupBuyId="5ZZ87" />);
  assert.match(html, /Uther group-buy guide/);
  assert.match(html, /Batch guide/);
  assert.doesNotMatch(html, /HGH 36IU/);
  assert.equal(renderToStaticMarkup(<HghBatchGuide groupBuyId="UTHER" />), "");
});

test("the guide is next to stock levels inside the product heading", () => {
  const source = readFileSync(new URL("../pages/OrderForm.tsx", import.meta.url), "utf8");
  assert.match(source, /<HghBatchGuide groupBuyId=\{gbId\}/);
  const heading = source.indexOf('className="order-form-products-heading');
  const guide = source.indexOf("<HghBatchGuide");
  const stock = source.indexOf("Stock levels", guide);
  assert.ok(heading < guide && guide < stock && stock - guide < 1500);
});
