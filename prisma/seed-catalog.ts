import fs from "node:fs";
import path from "node:path";
import { parseSteakbossPriceSheetCsv } from "../src/domain/price-sheet-parser";

const csvPath = path.join(process.cwd(), "prisma/data/price-sheet-2569-11-21.csv");
const csvText = fs.readFileSync(csvPath, "utf8");
const parsed = parseSteakbossPriceSheetCsv(csvText);

export const SEED_CATEGORIES = [
  ...parsed.categories,
  { slug: "set", name: "เซ็ตคุ้ม", sortOrder: 6 },
];

export interface SeedProductEntry {
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  description: string;
  catSlug: string;
  weightGrams: number;
  priceBaht: number;
  wholesalePriceBaht: number;
  bulkPriceBaht: number | null;
  bulkMinQty: number;
  packSize: number;
  costBaht: number;
  stockQty: number;
  tag: string;
  isNew: boolean;
  isBundle: boolean;
  isActive: boolean;
  platedImgUrl: string;
  packImgUrl: string;
  wideImgUrl?: string | null;
  sortOrder: number;
}

export const SEED_PRODUCTS: SeedProductEntry[] = [
  ...parsed.products.map((p) => ({
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    catSlug: p.categorySlug,
    weightGrams: p.weightGrams,
    priceBaht: p.priceBaht,
    wholesalePriceBaht: p.wholesalePriceBaht,
    bulkPriceBaht: p.bulkPriceBaht,
    bulkMinQty: p.bulkMinQty,
    packSize: p.packSize,
    costBaht: Math.round(p.wholesalePriceBaht * 0.75 * 100) / 100,
    stockQty: p.isActive ? 80 : 0,
    tag: p.tag,
    isNew: p.isNew,
    isBundle: false,
    isActive: p.isActive,
    platedImgUrl: p.platedImgUrl,
    packImgUrl: p.packImgUrl,
    wideImgUrl: p.wideImgUrl,
    sortOrder: p.sortOrder,
  })),
  {
    slug: "best-seller-set-4",
    sku: "SB-SET-4",
    name: "เซ็ตรวมฮิต 4 ซอง",
    subtitle: "พอร์คชอป KP + หมูนุ่ม BIG + ไก่นุ่ม BIG + ไก่คลีน P",
    catSlug: "set",
    weightGrams: 670,
    priceBaht: 179,
    wholesalePriceBaht: 145,
    bulkPriceBaht: 139,
    bulkMinQty: 5,
    packSize: 4,
    costBaht: 115,
    stockQty: 0,
    tag: "เซ็ตสุดคุ้ม",
    isNew: true,
    isBundle: true,
    isActive: true,
    platedImgUrl: "/images/products/set-plated.jpg",
    packImgUrl: "/images/products/set-pack.jpg",
    wideImgUrl: null,
    description:
      "รวม 4 เมนูขายดีในเซ็ตเดียว ทั้งหมูและไก่พร้อมย่าง ประหยัดกว่าซื้อแยกซอง เหมาะสำหรับติดตู้ฟรีซไว้ทานทั้งสัปดาห์",
    sortOrder: 90,
  },
];
