import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { importPriceSheetCsv } from "@/services/catalog-import.service";

describe("catalog CSV import service", () => {
  it("upserts all 88 price-sheet items while preserving custom stockQty and costBaht", async () => {
    const csvPath = path.join(process.cwd(), "prisma/data/price-sheet-2569-11-21.csv");
    const csvText = fs.readFileSync(csvPath, "utf8");

    const kpBefore = await db.product.findUniqueOrThrow({
      where: { slug: "pork-chop-kp" },
    });
    await db.product.update({
      where: { id: kpBefore.id },
      data: { stockQty: 123, costBaht: 41.5 },
    });

    const summary = await importPriceSheetCsv(csvText);
    expect(summary.totalParsed).toBe(88);
    expect(summary.updatedCount).toBe(88);
    expect(summary.inactiveCount).toBe(2);

    const kpAfter = await db.product.findUniqueOrThrow({
      where: { slug: "pork-chop-kp" },
    });
    expect(kpAfter.stockQty).toBe(123);
    expect(kpAfter.costBaht).toBe(41.5);
    expect(kpAfter.priceBaht).toBe(65);
    expect(kpAfter.wholesalePriceBaht).toBe(52);
    expect(kpAfter.bulkPriceBaht).toBe(50);

    // Restore original seeded values
    await db.product.update({
      where: { id: kpBefore.id },
      data: { stockQty: kpBefore.stockQty, costBaht: kpBefore.costBaht },
    });
  });
});
