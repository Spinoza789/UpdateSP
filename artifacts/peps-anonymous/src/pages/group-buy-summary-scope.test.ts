import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sources = [
  ["Admin", "../components/admin/group-buys/panels/SummaryPanel.tsx"],
  ["Organiser", "./GbOrganiser.tsx"],
] as const;

for (const [name, path] of sources) {
  const file = readFileSync(new URL(path, import.meta.url), "utf8");
  const start = file.indexOf(name === "Admin" ? "export function SummarySubTab" : "export function SummaryTab");
  const source = file.slice(start);

  test(`${name} summary initially requests all orders, not only Submitted`, () => {
    assert.match(source, /const \[statusFilter, setStatusFilter\] = useState\("all"\)/);
    assert.match(source, /new URLSearchParams\(\{ status: statusFilter \}\)/);
    assert.match(source, /summary\/breakdown\?\$\{/);
  });

  test(`${name} summary can explicitly filter Processing orders`, () => {
    const statuses = source.match(/const ORDER_STATUSES = \[([^\]]+)\]/)?.[1] ?? "";
    assert.match(statuses, /"Processing"/);
    assert.match(statuses, /"Shipped"/);
    assert.match(statuses, /"Submitted"/);
  });

  test(`${name} headline totals always use the unfiltered orders`, () => {
    assert.ok(source.includes("/summary?status=all"), "Must fetch all orders separately from the filtered list");
    assert.ok(source.includes("allRows.reduce"), "Headline totals must not use filtered rows");
    assert.ok(source.includes('label: "Total Qty", value: String(allTotalQty)'));
    assert.ok(source.includes('label: "Products", value: String(allRows.length)'));
    assert.ok(source.includes("Top totals always include all orders"));
    assert.ok(source.includes("summaryError"), "Failed totals must be shown as an error, not zero");
  });
}
