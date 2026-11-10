import { createHash } from "node:crypto";
import { VendorPortalError } from "./vendor-portal-model";

export interface PriceProduct { id: string; name: string; wholesaleCost: string | number | null; wholesalePrice: string | number | null }
const HEADERS = ["Product ID", "Product name", "Supplier cost (USD)", "Selling price (USD)"];
const normal = (n: string | number | null) => n == null ? null : Number(n).toFixed(2);
export function exportPriceCsv(products: PriceProduct[]) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [HEADERS, ...products.map(p =>
    [p.id, p.name, normal(p.wholesaleCost), normal(p.wholesalePrice)])]
    .map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

function parse(text: string) {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > 1_000_000) {
    throw new VendorPortalError("Choose a CSV file up to 1 MB.", 400);
  }
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false;
  const push = () => { row.push(value); value = ""; closed = false; };
  const end = () => {
    push();
    if (row.some(v => v.trim())) rows.push(row);
    row = [];
    if (rows.length > 10_001) throw new VendorPortalError("CSV supports up to 10,000 product rows.", 400);
  };
  const csv = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c !== '"') value += c;
      else if (csv[i + 1] === '"') { value += '"'; i++; }
      else { quoted = false; closed = true; }
    } else if (c === ",") push();
    else if (c === "\n" || c === "\r") { end(); if (c === "\r" && csv[i + 1] === "\n") i++; }
    else if (c === '"' && !value && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new VendorPortalError("Invalid quoted CSV cell. Export as comma-separated CSV.", 400);
      value += c;
    }
  }
  if (quoted) throw new VendorPortalError("Unclosed quoted CSV cell.", 400);
  if (value || row.length || closed) end();
  return rows;
}

export function planPriceCsv(text: string, products: PriceProduct[], vendorId: string) {
  const [header = [], ...rows] = parse(text);
  const headers = header.map(h => h.trim().toLowerCase());
  const allowed = HEADERS.map(h => h.toLowerCase());
  if (headers.some(h => !allowed.includes(h)) || new Set(headers).size !== headers.length
    || !headers.includes("product id") || !headers.some(h => h === allowed[2] || h === allowed[3])) {
    throw new VendorPortalError("Use the downloaded headers: Product ID, Product name, Supplier cost (USD), Selling price (USD). Product ID and a price column are required.", 400);
  }
  if (!rows.length) throw new VendorPortalError("The CSV has no product rows.", 400);
  const lookup = new Map(products.map(p => [p.id, p])), seen = new Set<string>();
  const changes: { id: string; name: string; beforeCost: string | null; beforePrice: string | null; cost?: string; price?: string }[] = [];
  const reviewed: unknown[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], line = i + 2;
    if (row.length !== header.length) throw new VendorPortalError(`Row ${line}: incorrect column count. Quote names containing commas.`, 400);
    let id = row[headers.indexOf("product id")].trim();
    // Reverse spreadsheet-safety escaping on identifiers only when it matches a real offer.
    if (!lookup.has(id) && id.startsWith("'") && lookup.has(id.slice(1))) id = id.slice(1);
    const p = lookup.get(id);
    if (!p) throw new VendorPortalError(`Row ${line}: Product ID ${id || "(empty)"} is not an active product for this supplier. No changes were saved.`, 400);
    if (seen.has(id)) throw new VendorPortalError(`Row ${line}: duplicate Product ID ${id}.`, 400);
    seen.add(id);
    const amount = (column: number, label: string) => {
      const index = headers.indexOf(allowed[column]), s = index < 0 ? "" : row[index].trim();
      if (!s) return undefined;
      if (!/^\d+(?:\.\d{1,2})?$/.test(s) || Number(s) > 99_999_999.99) {
        throw new VendorPortalError(`Row ${line}: ${label} must be a non-negative USD number with at most two decimal places (maximum 99999999.99).`, 400);
      }
      return Number(s).toFixed(2);
    };
    const cost = amount(2, "supplier cost"), price = amount(3, "selling price");
    const beforeCost = normal(p.wholesaleCost), beforePrice = normal(p.wholesalePrice);
    reviewed.push({ id, name: p.name, beforeCost, beforePrice, cost, price });
    const changedCost = cost !== undefined && cost !== beforeCost;
    const changedPrice = price !== undefined && price !== beforePrice;
    if (changedCost || changedPrice) changes.push({ id, name: p.name, beforeCost, beforePrice,
      ...(changedCost ? { cost } : {}), ...(changedPrice ? { price } : {}) });
  }
  return { rows: rows.length, unchanged: rows.length - changes.length, changes,
    previewToken: createHash("sha256").update(JSON.stringify({ vendorId, reviewed })).digest("hex") };
}
