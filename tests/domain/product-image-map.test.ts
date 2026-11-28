import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSteakbossPriceSheetCsv } from "@/domain/price-sheet-parser";

describe("product image mapping coverage & accuracy", () => {
  const csvPath = path.join(process.cwd(), "prisma/data/price-sheet-2569-11-21.csv");
  const csvText = fs.readFileSync(csvPath, "utf8");
  const { products } = parseSteakbossPriceSheetCsv(csvText);

  it("maps every single catalog product to an existing non-empty image file in public/", () => {
    const publicDir = path.join(process.cwd(), "public");
    for (const p of products) {
      for (const rel of [p.platedImgUrl, p.packImgUrl, p.wideImgUrl]) {
        if (!rel) continue;
        const abs = path.join(publicDir, rel.replace(/^\//, ""));
        expect(fs.existsSync(abs), `Missing image ${rel} for ${p.name}`).toBe(true);
        const stat = fs.statSync(abs);
        expect(stat.size, `Image ${rel} too small`).toBeGreaterThan(5_000);
      }
    }
  });

  it("assigns category-accurate dish images (no chicken/beef on fish, no steak set on ready meals)", () => {
    const fishProducts = products.filter((p) => p.categorySlug === "fish");
    expect(fishProducts.length).toBeGreaterThan(0);
    for (const p of fishProducts) {
      expect(p.platedImgUrl).toMatch(/^\/images\/products\/fish-/);
      expect(p.packImgUrl).toBe("/images/products/fish-pack.jpg");
    }

    const readyMeals = products.filter((p) => p.categorySlug === "ready-meal");
    expect(readyMeals.length).toBe(19);
    for (const p of readyMeals) {
      expect(p.platedImgUrl).toMatch(/^\/images\/products\/rm-/);
      expect(p.packImgUrl).toBe("/images/products/ready-meal-pack.jpg");
    }

    const duck = products.find((p) => p.name.includes("เป็ด"));
    expect(duck?.platedImgUrl).toBe("/images/products/beef-duck-breast.jpg");

    const tbone = products.find((p) => p.name.includes("ทีโบน PM"));
    expect(tbone?.platedImgUrl).toBe("/images/products/beef-tbone.jpg");

    const ribeye = products.find((p) => p.name.includes("ริบอาย"));
    expect(ribeye?.platedImgUrl).toBe("/images/products/beef-ribeye.jpg");

    const skewers = products.filter((p) => p.name.includes("เสียบไม้"));
    expect(skewers).toHaveLength(2);
    for (const s of skewers) {
      expect(s.platedImgUrl).toMatch(/skewers\.jpg$/);
    }
  });
});
