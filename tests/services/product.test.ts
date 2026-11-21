import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adjustProductStock, listAdminProducts } from "@/services/product.service";

describe("product_backend service", () => {
  it("computes bundle stock dynamically from child SKUs and respects cost visibility", async () => {
    const withoutCost = await listAdminProducts(false);
    const setProd = withoutCost.find((p) => p.slug === "best-seller-set-4");
    expect(setProd).toBeDefined();
    expect(setProd?.isBundle).toBe(true);
    expect(setProd?.availableStock).toBeGreaterThan(0);
    expect(setProd?.bundleSavingsBaht).toBe(27);
    expect(setProd?.costBaht).toBeUndefined();

    const withCost = await listAdminProducts(true);
    const kp = withCost.find((p) => p.slug === "pork-chop-kp");
    expect(kp?.costBaht).toBe(52);
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

    // Restore back so seed remains clean
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
