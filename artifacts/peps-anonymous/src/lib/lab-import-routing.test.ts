import assert from "node:assert/strict";
import { test } from "node:test";
import { janoshikUrls } from "./lab-import-routing";
test("routes Janoshik report hosts to the browser helper, not the server importer", () => {
  const report = "https://verify.janoshik.com/tests/249731-Retatrutide_40mg_RE401023_D3DUW96M2J1B";
  assert.deepEqual(janoshikUrls([report, "https://uzorak.com/report/1", "https://janoshik.com.evil.test/report"]), [report]);
  assert.deepEqual(janoshikUrls(["not a URL", "ftp://janoshik.com/file", "https://janoshik.com/tests/1"]), ["https://janoshik.com/tests/1"]);
});
