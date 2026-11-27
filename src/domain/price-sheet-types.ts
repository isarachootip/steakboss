import { roundBaht } from "./money";
import type { PriceSheetCategorySlug } from "./price-sheet-normalizer";

export interface ParsedCategory {
  slug: PriceSheetCategorySlug;
  name: string;
  sortOrder: number;
}

export interface ParsedCatalogProduct {
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  description: string;
  categorySlug: PriceSheetCategorySlug;
  weightGrams: number;
  priceBaht: number;
  wholesalePriceBaht: number;
  bulkPriceBaht: number | null;
  bulkMinQty: number;
  packSize: number;
  isActive: boolean;
  isNew: boolean;
  tag: string;
  platedImgUrl: string;
  packImgUrl: string;
  wideImgUrl: string | null;
  sortOrder: number;
  rawWholesaleUnitBaht: number;
}

export const PRICE_SHEET_CATEGORIES: ParsedCategory[] = [
  { slug: "pork", name: "หมู", sortOrder: 1 },
  { slug: "beef", name: "เนื้อวัว & อื่นๆ", sortOrder: 2 },
  { slug: "chicken", name: "ไก่", sortOrder: 3 },
  { slug: "fish", name: "ปลา", sortOrder: 4 },
  { slug: "ready-meal", name: "อาหารพร้อมทาน & เครื่องเคียง", sortOrder: 5 },
];

export function detectSectionCategory(lineText: string): PriceSheetCategorySlug | null {
  if (!lineText.includes("ใบราคา")) return null;
  if (lineText.includes("อาหารพร้อมทาน")) return "ready-meal";
  if (lineText.includes("ปลา")) return "fish";
  if (lineText.includes("ไก่")) return "chicken";
  if (lineText.includes("เนื้อวัว")) return "beef";
  if (lineText.includes("หมู")) return "pork";
  return null;
}

export function parseWeightGrams(raw: string): number {
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  return m ? Math.max(1, Math.round(Number(m[1]))) : 100;
}

export function parseBulkCell(
  rawCell: string,
  sectionDefaultMinPieces: number
): { minPieces: number; unitBulkBaht: number | null } {
  const trimmed = rawCell.trim();
  if (!trimmed || /^x$/i.test(trimmed) || /^na$/i.test(trimmed)) {
    return { minPieces: 0, unitBulkBaht: null };
  }
  const explicitMatch = trimmed.match(/(\d+)\s*ชิ้นขึ้นไป\s*(\d+(?:\.\d+)?)/);
  if (explicitMatch) {
    return {
      minPieces: Number(explicitMatch[1]),
      unitBulkBaht: roundBaht(Number(explicitMatch[2])),
    };
  }
  const num = Number(trimmed);
  if (Number.isFinite(num) && num > 0) {
    return { minPieces: sectionDefaultMinPieces, unitBulkBaht: roundBaht(num) };
  }
  return { minPieces: 0, unitBulkBaht: null };
}
