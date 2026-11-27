import { multiplyBaht, roundBaht } from "./money";
import {
  buildDeterministicIds,
  detectPackInfo,
  extractSubtitle,
  normalizeProductTitle,
  parseCsvRows,
  resolveDefaultImages,
  type PriceSheetCategorySlug,
} from "./price-sheet-normalizer";
import {
  detectSectionCategory,
  parseBulkCell,
  parseWeightGrams,
  PRICE_SHEET_CATEGORIES,
  type ParsedCatalogProduct,
  type ParsedCategory,
} from "./price-sheet-types";

export {
  PRICE_SHEET_CATEGORIES,
  type ParsedCatalogProduct,
  type ParsedCategory,
} from "./price-sheet-types";

interface DraftRow {
  categorySlug: PriceSheetCategorySlug;
  cleanName: string;
  rawPieceGrams: number;
  rawRetailBaht: number;
  rawWholesaleBaht: number;
  bulkMinPieces: number;
  rawBulkBaht: number | null;
  isActive: boolean;
  orderIdx: number;
}

export function parseSteakbossPriceSheetCsv(csvText: string): {
  categories: ParsedCategory[];
  products: ParsedCatalogProduct[];
} {
  const rows = parseCsvRows(csvText);
  let currentCat: PriceSheetCategorySlug | null = null;
  let defaultBulkPieces = 10;
  let inTastingPromo = false;
  const drafts: DraftRow[] = [];
  const featuredWholesaleHints = new Set<number>();

  for (const row of rows) {
    const c0 = row[0] ?? "";
    if (c0.includes("โปรให้ชิม")) {
      inTastingPromo = true;
      continue;
    }
    if (inTastingPromo) {
      const wPrice = Number(row[1] ?? "");
      const promoPrice = Number(row[3] ?? "");
      if (Number.isFinite(wPrice) && wPrice > 0 && Number.isFinite(promoPrice) && promoPrice > 0) {
        featuredWholesaleHints.add(roundBaht(wPrice));
      }
      continue;
    }

    const nextSection = detectSectionCategory(c0);
    if (nextSection) {
      currentCat = nextSection;
      defaultBulkPieces = 10;
      continue;
    }
    if (!currentCat || c0.startsWith("รายการ")) continue;

    const bulkHeaderMatch = (row[4] ?? "").match(/\*?\s*(\d+)\s*ชิ้นขึ้นไป\s*\*?/);
    if (bulkHeaderMatch && (!row[3] || Number(row[1] ?? "0") === 0)) {
      defaultBulkPieces = Number(bulkHeaderMatch[1]);
      continue;
    }

    const rawName = c0.trim();
    if (!rawName) continue;

    const rawRetailStr = (row[1] ?? "").trim();
    const rawWholesaleStr = (row[3] ?? "").trim();
    const isNa = /^na$/i.test(rawWholesaleStr) || (!rawRetailStr && !rawWholesaleStr);
    const rawWholesale = isNa ? 0 : roundBaht(Number(rawWholesaleStr));
    const rawRetail = isNa
      ? 0
      : rawRetailStr
        ? roundBaht(Number(rawRetailStr))
        : multiplyBaht(rawWholesale, 1.25);

    if (!isNa && (!Number.isFinite(rawRetail) || !Number.isFinite(rawWholesale))) continue;

    const bulk = parseBulkCell(row[4] ?? "", defaultBulkPieces);
    drafts.push({
      categorySlug: currentCat,
      cleanName: normalizeProductTitle(rawName),
      rawPieceGrams: parseWeightGrams(row[5] ?? rawName),
      rawRetailBaht: rawRetail,
      rawWholesaleBaht: rawWholesale,
      bulkMinPieces: bulk.minPieces,
      rawBulkBaht: bulk.unitBulkBaht,
      isActive: !isNa,
      orderIdx: drafts.length + 1,
    });
  }

  const nameCounts = new Map<string, number>();
  for (const d of drafts) {
    const key = `${d.categorySlug}:${d.cleanName}`;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  const products: ParsedCatalogProduct[] = drafts.map((d) => {
    const hasDuplicateName = (nameCounts.get(`${d.categorySlug}:${d.cleanName}`) ?? 0) > 1;
    const pack = detectPackInfo(d.cleanName);
    const totalWeightGrams = d.rawPieceGrams * pack.multiplier;
    const priceBaht = multiplyBaht(d.rawRetailBaht, pack.multiplier);
    const wholesalePriceBaht = multiplyBaht(d.rawWholesaleBaht, pack.multiplier);
    const bulkPriceBaht = d.rawBulkBaht !== null ? multiplyBaht(d.rawBulkBaht, pack.multiplier) : null;
    const bulkMinQty =
      bulkPriceBaht !== null && d.bulkMinPieces > 0
        ? Math.max(1, Math.ceil(d.bulkMinPieces / pack.multiplier))
        : 0;
    const displayName = hasDuplicateName ? `${d.cleanName} (${totalWeightGrams}g)` : d.cleanName;
    const ids = buildDeterministicIds(d.categorySlug, d.cleanName, totalWeightGrams, hasDuplicateName);
    const imgs = resolveDefaultImages(d.categorySlug, d.cleanName);
    const isFeatured =
      (d.categorySlug === "pork" || d.categorySlug === "beef") &&
      featuredWholesaleHints.has(d.rawWholesaleBaht);

    return {
      slug: ids.slug,
      sku: ids.sku,
      name: displayName,
      subtitle: extractSubtitle(d.cleanName, pack.packSize, pack.multiplier, pack.unitWord, d.rawPieceGrams, d.rawWholesaleBaht),
      description: `${displayName} น้ำหนักสุทธิ ${totalWeightGrams} กรัม ผลิตจากโรงงานสเต๊กบอสส์ แพ็คสุญญากาศแช่แข็ง -18°C พร้อมละลายและปรุงเสิร์ฟได้ทันที`,
      categorySlug: d.categorySlug,
      weightGrams: totalWeightGrams,
      priceBaht,
      wholesalePriceBaht,
      bulkPriceBaht,
      bulkMinQty,
      packSize: pack.packSize,
      isActive: d.isActive,
      isNew: d.cleanName.includes("นำเข้าเกรดดี") || d.cleanName.includes("PREMIUM"),
      tag: isFeatured ? "สินค้าเด่นขายดี" : "",
      platedImgUrl: imgs.platedImgUrl,
      packImgUrl: imgs.packImgUrl,
      wideImgUrl: imgs.wideImgUrl,
      sortOrder: d.orderIdx,
      rawWholesaleUnitBaht: d.rawWholesaleBaht,
    };
  });

  return { categories: PRICE_SHEET_CATEGORIES, products };
}
