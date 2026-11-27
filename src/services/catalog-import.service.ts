import { db } from "@/lib/db";
import { parseSteakbossPriceSheetCsv } from "@/domain/price-sheet-parser";

export interface CatalogImportResult {
  totalParsed: number;
  createdCount: number;
  updatedCount: number;
  inactiveCount: number;
}

export async function importPriceSheetCsv(
  csvText: string,
  options?: { defaultStockQty?: number }
): Promise<CatalogImportResult> {
  const defaultStockQty = options?.defaultStockQty ?? 50;
  const parsed = parseSteakbossPriceSheetCsv(csvText);

  if (parsed.products.length === 0) {
    throw new Error("ไม่พบรายการสินค้าในไฟล์ CSV กรุณาตรวจสอบรูปแบบใบราคา");
  }

  return db.$transaction(async (tx) => {
    for (const cat of parsed.categories) {
      await tx.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, sortOrder: cat.sortOrder },
        create: cat,
      });
    }

    const categories = await tx.category.findMany();
    const catMap = new Map(categories.map((c) => [c.slug, c.id]));

    const existingRows = await tx.product.findMany({
      select: {
        id: true,
        slug: true,
        sku: true,
      },
    });
    const bySlug = new Map(existingRows.map((r) => [r.slug, r]));
    const bySku = new Map(existingRows.map((r) => [r.sku, r]));

    let createdCount = 0;
    let updatedCount = 0;
    let inactiveCount = 0;

    for (const item of parsed.products) {
      const categoryId = catMap.get(item.categorySlug);
      if (!categoryId) continue;

      if (!item.isActive) inactiveCount += 1;
      const existing = bySlug.get(item.slug) ?? bySku.get(item.sku);

      if (existing) {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            subtitle: item.subtitle,
            categoryId,
            weightGrams: item.weightGrams,
            priceBaht: item.priceBaht,
            wholesalePriceBaht: item.wholesalePriceBaht,
            bulkPriceBaht: item.bulkPriceBaht,
            bulkMinQty: item.bulkMinQty,
            packSize: item.packSize,
            isActive: item.isActive,
            isNew: item.isNew,
            tag: item.tag,
            sortOrder: item.sortOrder,
          },
        });
        updatedCount += 1;
      } else {
        await tx.product.create({
          data: {
            slug: item.slug,
            sku: item.sku,
            name: item.name,
            subtitle: item.subtitle,
            description: item.description,
            categoryId,
            weightGrams: item.weightGrams,
            priceBaht: item.priceBaht,
            wholesalePriceBaht: item.wholesalePriceBaht,
            bulkPriceBaht: item.bulkPriceBaht,
            bulkMinQty: item.bulkMinQty,
            packSize: item.packSize,
            costBaht: 0,
            stockQty: item.isActive ? defaultStockQty : 0,
            isBundle: false,
            isNew: item.isNew,
            isActive: item.isActive,
            tag: item.tag,
            platedImgUrl: item.platedImgUrl,
            packImgUrl: item.packImgUrl,
            wideImgUrl: item.wideImgUrl,
            sortOrder: item.sortOrder,
          },
        });
        createdCount += 1;
      }
    }

    return {
      totalParsed: parsed.products.length,
      createdCount,
      updatedCount,
      inactiveCount,
    };
  });
}
