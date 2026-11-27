import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  adjustProductStock,
  createProduct,
  deleteProduct,
  listAdminProducts,
  updateProduct,
} from "@/services/product.service";
import { createProductSchema } from "@/schemas/product.schema";

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

  it("creates, updates images, deletes unused products, and blocks deleting bundle child SKUs", async () => {
    const category = await db.category.findFirstOrThrow();
    const stamp = Date.now();
    const slug = `test-crud-steak-${stamp}`;

    const unsafe = createProductSchema.safeParse({
      slug,
      sku: `SKU-${stamp}`,
      name: "Unsafe Test",
      categoryId: category.id,
      weightGrams: 180,
      priceBaht: 65,
      platedImgUrl: "javascript:alert(1)",
      packImgUrl: "/images/products/kp-pack.jpg",
    });
    expect(unsafe.success).toBe(false);

    const parsed = createProductSchema.parse({
      slug,
      sku: `SKU-${stamp}`,
      name: "สเต็กทดสอบ CRUD",
      subtitle: "หมักสูตรพิเศษ",
      description: "รายละเอียดทดสอบ",
      categoryId: category.id,
      weightGrams: 200,
      priceBaht: 79,
      wholesalePriceBaht: 60,
      platedImgUrl: "/api/uploads/test-plated.jpg",
      packImgUrl: "/api/uploads/test-pack.jpg",
      wideImgUrl: "",
      isNew: true,
    });
    expect(parsed.wideImgUrl).toBeNull();

    const created = await createProduct(parsed);
    try {
      expect(created.platedImgUrl).toBe("/api/uploads/test-plated.jpg");
      expect(created.isNew).toBe(true);

      const updated = await updateProduct(created.id, {
        platedImgUrl: "/api/uploads/test-plated-v2.jpg",
        wideImgUrl: "/api/uploads/test-wide.jpg",
      });
      expect(updated.platedImgUrl).toBe("/api/uploads/test-plated-v2.jpg");
      expect(updated.wideImgUrl).toBe("/api/uploads/test-wide.jpg");

      await deleteProduct(created.id);
      const gone = await db.product.findUnique({ where: { id: created.id } });
      expect(gone).toBeNull();

      // Bundle component SKU must not be deletable
      const kp = await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } });
      await expect(deleteProduct(kp.id)).rejects.toThrow(/เซ็ต|สั่งซื้อ/);
    } finally {
      await db.product.deleteMany({ where: { slug } });
    }
  });
});
