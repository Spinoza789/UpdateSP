import { describe, expect, it } from "vitest";
import { exportPriceCsv, planPriceCsv } from "./wholesale-price-csv";

const products = [
  { id: "p1", name: 'Product, "one"', wholesaleCost: null, wholesalePrice: null },
  { id: "p2", name: "Product two", wholesaleCost: "10.00", wholesalePrice: "25.00" },
];
const header = "Product ID,Product name,Supplier cost (USD),Selling price (USD)\r\n";
describe("wholesale price CSV", () => {
  it("round trips every product, including empty prices and quoted names, without changes", () => {
    const csv = exportPriceCsv(products);
    expect(csv).toContain('"Product, ""one"""');
    expect(planPriceCsv(csv, products, "vendor")).toMatchObject({ rows: 2, unchanged: 2, changes: [] });
  });
  it("fills blank prices, preserves blank cells and accepts explicit zero", () => {
    const plan = planPriceCsv(header + 'p1,Name,5.50,12\r\np2,Name,,0', products, "vendor");
    expect(plan.changes).toEqual([
      { id: "p1", name: products[0].name, beforeCost: null, beforePrice: null, cost: "5.50", price: "12.00" },
      { id: "p2", name: products[1].name, beforeCost: "10.00", beforePrice: "25.00", price: "0.00" },
    ]);
  });
  it("binds preview tokens to edited prices, current prices and vendor", () => {
    const csv = header + "p2,Name,,30";
    const token = planPriceCsv(csv, products, "vendor").previewToken;
    expect(planPriceCsv(csv, products, "other").previewToken).not.toBe(token);
    expect(planPriceCsv(csv, [{ ...products[1], wholesalePrice: "26" }], "vendor").previewToken).not.toBe(token);
    expect(planPriceCsv(csv.replace("30", "31"), products, "vendor").previewToken).not.toBe(token);
  });
  it.each(["-1", "NaN", "Infinity", "1.234", "100000000", "=1+2", "1e2", "$20"])("rejects invalid price %s", price => {
    expect(() => planPriceCsv(header + `p1,Name,${price},`, products, "vendor")).toThrow(/row 2.*supplier cost/i);
  });
  it("rejects unknown/cross-vendor products, duplicates and malformed CSV before any write", () => {
    expect(() => planPriceCsv(header + "elsewhere,Name,,30", products, "vendor")).toThrow(/not.*supplier/i);
    expect(() => planPriceCsv(header + "p1,Name,1,2\np1,Name,2,3", products, "vendor")).toThrow(/duplicate/i);
    expect(() => planPriceCsv(header + 'p1,"unclosed,1,2', products, "vendor")).toThrow(/quoted/i);
    expect(() => planPriceCsv("Product name,Selling price (USD)\nName,3", products, "vendor")).toThrow(/Product ID/i);
  });
  it("exports more than one page, safely escapes spreadsheet formulas and supports BOM and reordered columns", () => {
    const all = Array.from({ length: 1148 }, (_, i) => ({ ...products[0], id: `p${i}` }));
    expect(planPriceCsv(exportPriceCsv(all), all, "vendor").rows).toBe(1148);
    expect(exportPriceCsv([{ ...products[0], name: "=HYPERLINK(1)" }])).toContain("'=HYPERLINK(1)");
    expect(planPriceCsv("\uFEFFSelling price (USD),Product ID\n30,p1\n", products, "vendor").changes[0].price).toBe("30.00");
  });
});
