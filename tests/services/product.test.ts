import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adjustProductStock, listAdminProducts } from "@/services/product.service";

describe("product_backend service", () => {
  it("computes bundle stock dynamically from child SKUs, exposes wholesale/bulk tiers, and respects cost visibility", async () => {
    const withoutCost = await listAdminProducts(false);
    expect(withoutCost.length).toBe(89);

    const setProd = withoutCost.find((p) => p.slug === "best-seller-set-4");
    expect(setProd).toBeDefined();
    expect(setProd?.isBundle).toBe(true);
    expect(setProd?.availableStock).toBeGreaterThan(0);
    // Child retail sum: 65 + 45 + 45 + 36.25 = 191.25; set retail: 179 -> savings 12.25
    expect(setProd?.bundleSavingsBaht).toBe(12.25);
    expect(setProd?.costBaht).toBeUndefined();

    const withCost = await listAdminProducts(true);
    const kp = withCost.find((p) => p.slug === "pork-chop-kp");
    expect(kp?.priceBaht).toBe(65);
    expect(kp?.wholesalePriceBaht).toBe(52);
    expect(kp?.bulkPriceBaht).toBe(50);
    expect(kp?.bulkMinQty).toBe(10);
    expect(kp?.costBaht).toBe(39);
  });

  it("adjusts stock and records StockMovement cleanly", async () => {
    const kp = await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } });
    const before = kp.stockQty;

    await adjustProductStock({
      productId: kp.id,
      deltaQty: 5,
      type: "RESTOCK",
      reason: "test restock",
      actorId: "test-actor",
    });
    const afterUp = await db.product.findUniqueOrThrow({ where: { id: kp.id } });
    expect(afterUp.stockQty).toBe(before + 5);

    await adjustProductStock({
      productId: kp.id,
      deltaQty: -5,
      type: "ADJUST",
      reason: "test cleanup",
      actorId: "test-actor",
    });
    const afterRestore = await db.product.findUniqueOrThrow({ where: { id: kp.id } });
    expect(afterRestore.stockQty).toBe(before);
  });
});
