import { z } from "zod";

const isSafeHref = (val: string): boolean => {
  const trimmed = val.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  );
};

const isOptionalSafeMediaUrl = (val: string): boolean => {
  const trimmed = val.trim();
  if (!trimmed) return true;
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  );
};

export const safeHrefSchema = z
  .string()
  .trim()
  .min(1, "กรุณาระบุลิงก์")
  .max(300)
  .refine(isSafeHref, "ลิงก์ต้องขึ้นต้นด้วย /, #, http:// หรือ https://");

export const optionalMediaUrlSchema = z
  .string()
  .trim()
  .max(400)
  .default("")
  .refine(isOptionalSafeMediaUrl, "URL รูปหรือวิดีโอไม่ถูกต้อง");

export const landingContentSchema = z.object({
  eyebrow: z.string().trim().min(1, "กรุณาระบุข้อความป้ายบน").max(80),
  headline: z.string().trim().min(2, "กรุณาระบุพาดหัวหลัก").max(200),
  subheadline: z.string().trim().min(2, "กรุณาระบุคำโปรย").max(400),
  heroImgUrl: safeHrefSchema,
  heroImgAlt: z.string().trim().min(1).max(160),
  packCardImgUrl: safeHrefSchema,
  packCardCaption: z.string().trim().min(1).max(80),
  badges: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "ต้องมีป้ายจุดเด่นอย่างน้อย 1 ข้อ")
    .max(6),
  primaryCtaLabel: z.string().trim().min(1).max(50),
  primaryCtaHref: safeHrefSchema,
  secondaryCtaLabel: z.string().trim().min(1).max(50),
  secondaryCtaHref: safeHrefSchema,
});

export const cookingStepSchema = z.object({
  title: z.string().trim().min(1, "กรุณาระบุหัวข้อขั้นตอน").max(100),
  description: z.string().trim().min(2, "กรุณาระบุรายละเอียดขั้นตอน").max(500),
  imageUrl: optionalMediaUrlSchema,
});

export const upsertCookingGuideSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "กรุณาระบุ slug")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug ใช้ได้เฉพาะตัวพิมพ์เล็ก a-z ตัวเลข และขีดกลาง (-)"),
  title: z.string().trim().min(2, "กรุณาระบุชื่อคู่มือ").max(140),
  equipmentLabel: z.string().trim().min(1, "กรุณาระบุชื่ออุปกรณ์/หมวด").max(60),
  summary: z.string().trim().min(4, "กรุณาระบุคำอธิบายสั้น").max(320),
  tempLabel: z.string().trim().max(60).default(""),
  durationLabel: z.string().trim().max(60).default(""),
  coverImgUrl: optionalMediaUrlSchema,
  videoUrl: optionalMediaUrlSchema,
  steps: z
    .array(cookingStepSchema)
    .min(1, "กรุณาเพิ่มขั้นตอนอย่างน้อย 1 ข้อ")
    .max(12),
  tips: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isPublished: z.boolean().default(true),
});

export const patchCookingGuideSchema = upsertCookingGuideSchema.partial();

export type LandingContentInput = z.infer<typeof landingContentSchema>;
export type CookingStep = z.infer<typeof cookingStepSchema>;
export type UpsertCookingGuideInput = z.infer<typeof upsertCookingGuideSchema>;
export type PatchCookingGuideInput = z.infer<typeof patchCookingGuideSchema>;

export interface CookingGuideDto extends UpsertCookingGuideInput {
  id: string;
  updatedAt?: string;
}
