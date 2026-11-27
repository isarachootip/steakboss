import type { db } from "@/lib/db";
import { computeAvailableStock, computeBundleSavings } from "@/domain/inventory";

export const PRODUCT_INCLUDE = {
  category: true,
  bundleComponents: {
    include: {
      child: {
        select: {
          id: true,
          slug: true,
          name: true,
          priceBaht: true,
          stockQty: true,
          isActive: true,
        },
      },
    },
  },
} as const;

export interface EnrichedProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  description: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  weightGrams: number;
  priceBaht: number;
  wholesalePriceBaht: number;
  bulkPriceBaht: number | null;
  bulkMinQty: number;
  packSize: number;
  costBaht?: number;
  stockQty: number;
  availableStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isBundle: boolean;
  bundleSavingsBaht: number;
  isNew: boolean;
  isActive: boolean;
  tag: string;
  platedImgUrl: string;
  packImgUrl: string;
  wideImgUrl: string | null;
  sortOrder: number;
  components: Array<{
    childProductId: string;
    childSlug: string;
    childName: string;
    quantity: number;
    childPriceBaht: number;
    childStockQty: number;
  }>;
}

type RawProduct = Awaited<
  ReturnType<typeof db.product.findMany<{ include: typeof PRODUCT_INCLUDE }>>
>[number];

export function enrichProduct(
  p: RawProduct,
  includeCost: boolean
): EnrichedProduct {
  const comps = p.bundleComponents.map((b) => ({
    childProductId: b.childProductId,
    childSlug: b.child.slug,
    childName: b.child.name,
    quantity: b.quantity,
    childPriceBaht: b.child.priceBaht,
    childStockQty: b.child.stockQty,
    childIsActive: b.child.isActive,
  }));

  const availableStock = computeAvailableStock({
    id: p.id,
    isBundle: p.isBundle,
    isActive: p.isActive,
    stockQty: p.stockQty,
    components: comps,
  });

  const bundleSavingsBaht = p.isBundle
    ? computeBundleSavings(p.priceBaht, comps)
    : 0;

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    categoryId: p.categoryId,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    weightGrams: p.weightGrams,
    priceBaht: p.priceBaht,
    wholesalePriceBaht: p.wholesalePriceBaht,
    bulkPriceBaht: p.bulkPriceBaht,
    bulkMinQty: p.bulkMinQty,
    packSize: p.packSize,
    ...(includeCost ? { costBaht: p.costBaht } : {}),
    stockQty: p.stockQty,
    availableStock,
    lowStockThreshold: p.lowStockThreshold,
    isLowStock: !p.isBundle && p.isActive && availableStock <= p.lowStockThreshold,
    isBundle: p.isBundle,
    bundleSavingsBaht,
    isNew: p.isNew,
    isActive: p.isActive,
    tag: p.tag,
    platedImgUrl: p.platedImgUrl,
    packImgUrl: p.packImgUrl,
    wideImgUrl: p.wideImgUrl,
    sortOrder: p.sortOrder,
    components: comps.map(({ childIsActive: _, ...rest }) => rest),
  };
}
