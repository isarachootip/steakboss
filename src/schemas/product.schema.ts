import { z } from "zod";

export const bundleComponentSchema = z.object({
  childProductId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

export const createProductSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "slug ต้องเป็น a-z, 0-9 และ -"),
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(160).default(""),
  description: z.string().trim().max(1000).default(""),
  categoryId: z.string().min(1),
  weightGrams: z.number().int().min(1).max(20000),
  priceBaht: z.number().int().min(0).max(100000),
  costBaht: z.number().int().min(0).max(100000).default(0),
  stockQty: z.number().int().min(0).max(100000).default(0),
  lowStockThreshold: z.number().int().min(0).max(1000).default(10),
  isBundle: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tag: z.string().trim().max(40).default(""),
  platedImgUrl: z.string().trim().min(1),
  packImgUrl: z.string().trim().min(1),
  wideImgUrl: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().default(10),
  bundleComponents: z.array(bundleComponentSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const adjustStockSchema = z.object({
  deltaQty: z.number().int().refine((n) => n !== 0, "จำนวนต้องไม่เป็น 0"),
  type: z.enum(["RESTOCK", "ADJUST"]),
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล").max(200),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(32).transform((s) => s.toUpperCase()),
  type: z.enum(["FIXED", "PERCENT", "FREE_SHIP"]),
  value: z.number().int().min(0).max(100000),
  minSubtotal: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const toggleCouponSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});
