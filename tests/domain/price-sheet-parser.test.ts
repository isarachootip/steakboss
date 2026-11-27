import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSteakbossPriceSheetCsv } from "@/domain/price-sheet-parser";

describe("SteakBoss factory price sheet CSV parser", () => {
  const csvPath = path.join(process.cwd(), "prisma/data/price-sheet-2569-11-21.csv");
  const csvText = fs.readFileSync(csvPath, "utf8");

  it("parses all 88 real products across 5 categories and skips section sub-headers", () => {
    const parsed = parseSteakbossPriceSheetCsv(csvText);
    expect(parsed.categories.map((c) => c.slug)).toEqual([
      "pork",
      "beef",
      "chicken",
      "fish",
      "ready-meal",
    ]);
    expect(parsed.products).toHaveLength(88);

    const slugs = new Set(parsed.products.map((p) => p.slug));
    const skus = new Set(parsed.products.map((p) => p.sku));
    expect(slugs.size).toBe(88);
    expect(skus.size).toBe(88);
  });

  it("marks 'na' price items as inactive and preserves canonical slugs for core items", () => {
    const { products } = parseSteakbossPriceSheetCsv(csvText);
    const inactive = products.filter((p) => !p.isActive);
    expect(inactive).toHaveLength(2);
    expect(inactive.map((p) => p.name)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("ไวท์ครีม"),
        expect.stringContaining("ขาหมูครึ่งขา"),
      ])
    );

    expect(products.find((p) => p.slug === "pork-chop-kp")?.wholesalePriceBaht).toBe(52);
    expect(products.find((p) => p.slug === "tender-pork-big")?.wholesalePriceBaht).toBe(36);
    expect(products.find((p) => p.slug === "chicken-steak-big")?.wholesalePriceBaht).toBe(36);
    expect(products.find((p) => p.slug === "easy-clean-chicken-p")?.wholesalePriceBaht).toBe(29);
  });

  it("converts 5-piece and 10-skewer multi-packs into whole-bag units while keeping 2-piece sets intact", () => {
    const { products } = parseSteakbossPriceSheetCsv(csvText);

    const easyChicken5 = products.find(
      (p) => p.categorySlug === "chicken" && p.packSize === 5 && p.name.includes("ไก่นุ่ม")
    );
    expect(easyChicken5).toBeDefined();
    expect(easyChicken5?.priceBaht).toBe(156.25);
    expect(easyChicken5?.wholesalePriceBaht).toBe(125);
    expect(easyChicken5?.bulkPriceBaht).toBe(115);
    expect(easyChicken5?.bulkMinQty).toBe(2);
    expect(easyChicken5?.weightGrams).toBe(600);

    const miniChicken10 = products.find(
      (p) => p.categorySlug === "chicken" && p.packSize === 10
    );
    expect(miniChicken10?.priceBaht).toBe(112.5);
    expect(miniChicken10?.wholesalePriceBaht).toBe(90);
    expect(miniChicken10?.weightGrams).toBe(500);

    const duoSet = products.find(
      (p) => p.categorySlug === "pork" && p.name.includes("คู่หู หมู+ไก่")
    );
    expect(duoSet?.packSize).toBe(2);
    expect(duoSet?.priceBaht).toBe(55);
    expect(duoSet?.wholesalePriceBaht).toBe(44);
    expect(duoSet?.bulkPriceBaht).toBe(41);
    expect(duoSet?.bulkMinQty).toBe(10);
    expect(duoSet?.weightGrams).toBe(220);
  });

  it("handles 5-piece bulk threshold for T-Bone PM/PS and imported beef, disambiguates duplicate salmon, and tags featured items", () => {
    const { products } = parseSteakbossPriceSheetCsv(csvText);

    const tbonePm = products.find((p) => p.name.includes("ทีโบน PM"));
    expect(tbonePm?.bulkMinQty).toBe(5);
    expect(tbonePm?.bulkPriceBaht).toBe(235);

    const importedCapa = products.find((p) => p.name.includes("CAPA"));
    expect(importedCapa?.bulkMinQty).toBe(5);
    expect(importedCapa?.bulkPriceBaht).toBe(280);
    expect(importedCapa?.tag).toBe("สินค้าเด่นขายดี");

    const salmon3Sauce = products.filter(
      (p) => p.categorySlug === "fish" && p.subtitle.includes("ซอส 3 ชนิด") && p.name.includes("ฟิเล")
    );
    expect(salmon3Sauce).toHaveLength(2);
    expect(salmon3Sauce.map((s) => s.weightGrams).sort((a, b) => a - b)).toEqual([130, 150]);

    const featured = products.filter((p) => p.tag === "สินค้าเด่นขายดี");
    expect(featured).toHaveLength(8);
  });
});
