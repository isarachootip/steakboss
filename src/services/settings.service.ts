import { db } from "@/lib/db";
import type { UpdateSettingsInput } from "@/schemas/settings.schema";
import type { z } from "zod";
import type { createCouponSchema } from "@/schemas/product.schema";

export async function getStoreSettings() {
  return db.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function updateStoreSettings(input: UpdateSettingsInput) {
  return db.storeSetting.upsert({
    where: { id: "default" },
    update: input,
    create: { id: "default", ...input },
  });
}

export async function listCategories() {
  return db.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function listCoupons() {
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createCoupon(input: z.infer<typeof createCouponSchema>) {
  return db.coupon.create({
    data: {
      code: input.code,
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive,
    },
  });
}

export async function setCouponActive(id: string, isActive: boolean) {
  return db.coupon.update({
    where: { id },
    data: { isActive },
  });
}
