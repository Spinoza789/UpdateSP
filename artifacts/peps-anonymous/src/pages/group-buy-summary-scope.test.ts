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

  test(`${name} summary explains whether its quantity is filtered`, () => {
    assert.match(source, /Totals include all order statuses/);
    assert.match(source, /Totals reflect the filters above/);
  });
}
