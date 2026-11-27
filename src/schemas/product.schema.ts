import { z } from "zod";

const moneySchema = z
  .number()
  .min(0)
  .max(100000)
  .transform((n) => Math.round(n * 100) / 100);

export const bundleComponentSchema = z.object({
  childProductId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

const isSafeProductImageUrl = (val: string): boolean => {
  const trimmed = val.trim();
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  );
};

const requiredImageUrlSchema = z
  .string()
  .trim()
  .min(1, "กรุณาระบุหรืออัปโหลดรูปสินค้า")
  .max(400)
  .refine(isSafeProductImageUrl, "URL รูปภาพต้องขึ้นต้นด้วย /, http:// หรือ https://");

const optionalWideImageUrlSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return val;
  }, z.string().max(400).nullable())
  .refine(
    (val) => val === null || isSafeProductImageUrl(val),
    "URL รูปภาพต้องขึ้นต้นด้วย /, http:// หรือ https://"
  )
  .optional();

export const createProductSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "slug ต้องเป็น a-z, 0-9 และ -"),
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(140),
  subtitle: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1000).default(""),
  categoryId: z.string().min(1),
  weightGrams: z.number().int().min(1).max(20000),
  priceBaht: moneySchema,
  wholesalePriceBaht: moneySchema.default(0),
  bulkPriceBaht: moneySchema.nullable().optional().default(null),
  bulkMinQty: z.number().int().min(0).max(1000).default(0),
  packSize: z.number().int().min(1).max(100).default(1),
  costBaht: moneySchema.default(0),
  stockQty: z.number().int().min(0).max(100000).default(0),
  lowStockThreshold: z.number().int().min(0).max(1000).default(10),
  isBundle: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tag: z.string().trim().max(40).default(""),
  platedImgUrl: requiredImageUrlSchema,
  packImgUrl: requiredImageUrlSchema,
  wideImgUrl: optionalWideImageUrlSchema,
  sortOrder: z.number().int().default(10),
  bundleComponents: z.array(bundleComponentSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const importPriceSheetCsvSchema = z.object({
  csvText: z.string().min(20, "เนื้อหาไฟล์ CSV สั้นเกินไป").max(2_000_000),
  defaultStockQty: z.number().int().min(0).max(10000).optional().default(50),
});

export const adjustStockSchema = z.object({
  deltaQty: z.number().int().refine((n) => n !== 0, "จำนวนต้องไม่เป็น 0"),
  type: z.enum(["RESTOCK", "ADJUST"]),
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล").max(200),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(32).transform((s) => s.toUpperCase()),
  type: z.enum(["FIXED", "PERCENT", "FREE_SHIP"]),
  value: moneySchema,
  minSubtotal: moneySchema.default(0),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const toggleCouponSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});
