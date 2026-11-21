import { db } from "@/lib/db";
import {
  enrichProduct,
  PRODUCT_INCLUDE,
  type EnrichedProduct,
} from "./product-mapper";
import type { z } from "zod";
import type {
  createProductSchema,
  updateProductSchema,
} from "@/schemas/product.schema";

export type { EnrichedProduct } from "./product-mapper";

export async function listCatalogProducts(): Promise<EnrichedProduct[]> {
  const rows = await db.product.findMany({
    where: { isActive: true },
    include: PRODUCT_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => enrichProduct(r, false));
}

export async function getProductBySlug(
  slug: string
): Promise<EnrichedProduct | null> {
  const row = await db.product.findUnique({
    where: { slug },
    include: PRODUCT_INCLUDE,
  });
  if (!row || !row.isActive) return null;
  return enrichProduct(row, false);
}

export async function listAdminProducts(
  includeCost: boolean
): Promise<EnrichedProduct[]> {
  const rows = await db.product.findMany({
    include: PRODUCT_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => enrichProduct(r, includeCost));
}

export async function createProduct(
  input: z.infer<typeof createProductSchema>
): Promise<EnrichedProduct> {
  const { bundleComponents, ...data } = input;
  const created = await db.product.create({
    data: {
      ...data,
      bundleComponents:
        data.isBundle && bundleComponents?.length
          ? {
              create: bundleComponents.map((c) => ({
                childProductId: c.childProductId,
                quantity: c.quantity,
              })),
            }
          : undefined,
    },
    include: PRODUCT_INCLUDE,
  });
  return enrichProduct(created, true);
}

export async function updateProduct(
  id: string,
  input: z.infer<typeof updateProductSchema>
): Promise<EnrichedProduct> {
  const { bundleComponents, ...data } = input;
  const updated = await db.$transaction(async (tx) => {
    if (bundleComponents !== undefined) {
      await tx.bundleItem.deleteMany({ where: { parentProductId: id } });
      if (bundleComponents.length > 0) {
        await tx.bundleItem.createMany({
          data: bundleComponents.map((c) => ({
            parentProductId: id,
            childProductId: c.childProductId,
            quantity: c.quantity,
          })),
        });
      }
    }
    return tx.product.update({
      where: { id },
      data,
      include: PRODUCT_INCLUDE,
    });
  });
  return enrichProduct(updated, true);
}

export async function adjustProductStock(params: {
  productId: string;
  deltaQty: number;
  type: "RESTOCK" | "ADJUST";
  reason: string;
  actorId: string;
}) {
  return db.$transaction(async (tx) => {
    const prod = await tx.product.findUnique({ where: { id: params.productId } });
    if (!prod) throw new Error("ไม่พบสินค้านี้");
    if (prod.isBundle) throw new Error("สินค้าเซ็ตคำนวณสต็อกจากสินค้าลูกโดยอัตโนมัติ");
    const nextQty = prod.stockQty + params.deltaQty;
    if (nextQty < 0) throw new Error("สต็อกคงเหลือไม่สามารถติดลบได้");

    const updated = await tx.product.update({
      where: { id: params.productId },
      data: { stockQty: nextQty },
    });
    await tx.stockMovement.create({
      data: {
        productId: params.productId,
        deltaQty: params.deltaQty,
        type: params.type,
        reason: params.reason,
        actorId: params.actorId,
      },
    });
    return updated;
  });
}
