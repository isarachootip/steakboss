import { z } from "zod";
import { optionalMediaUrlSchema, safeHrefSchema } from "./content.schema";

const isOptionalSafeHref = (val: string): boolean => {
  const trimmed = val.trim();
  if (!trimmed) return true;
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  );
};

export const optionalSafeHrefSchema = z
  .string()
  .trim()
  .max(300)
  .default("")
  .refine(isOptionalSafeHref, "ลิงก์ต้องขึ้นต้นด้วย /, #, http:// หรือ https://");

export const optionalDateIsoSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return val;
  }, z.string().nullable())
  .refine(
    (val) => val === null || !Number.isNaN(Date.parse(val)),
    "รูปแบบวันเวลาไม่ถูกต้อง"
  )
  .transform((val) => (val === null ? null : new Date(val).toISOString()));

export const heroSlideModeSchema = z.enum(["TEXT_OVERLAY", "IMAGE_BANNER"]);
export type HeroSlideMode = z.infer<typeof heroSlideModeSchema>;

const baseHeroSlideObject = z.object({
  mode: heroSlideModeSchema.default("TEXT_OVERLAY"),
  title: z.string().trim().min(1, "กรุณาระบุชื่อสไลด์/คำอธิบายรูป").max(160),
  imageUrl: safeHrefSchema,
  eyebrow: z.string().trim().max(80).default(""),
  headline: z.string().trim().max(200).default(""),
  subheadline: z.string().trim().max(400).default(""),
  packCardImgUrl: optionalMediaUrlSchema,
  packCardCaption: z.string().trim().max(80).default(""),
  badges: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  primaryCtaLabel: z.string().trim().max(50).default(""),
  primaryCtaHref: optionalSafeHrefSchema,
  secondaryCtaLabel: z.string().trim().max(50).default(""),
  secondaryCtaHref: optionalSafeHrefSchema,
  linkHref: optionalSafeHrefSchema,
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  startsAt: optionalDateIsoSchema.default(null),
  endsAt: optionalDateIsoSchema.default(null),
});

function validateScheduleWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  ctx: z.RefinementCtx
): void {
  if (startsAt && endsAt && Date.parse(startsAt) > Date.parse(endsAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "เวลาสิ้นสุดต้องมากกว่าหรือเท่ากับเวลาเริ่มต้น",
    });
  }
}

export const upsertHeroSlideSchema = baseHeroSlideObject.superRefine((data, ctx) => {
  validateScheduleWindow(data.startsAt, data.endsAt, ctx);
  if (data.mode === "TEXT_OVERLAY" && data.headline.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["headline"],
      message: "โหมดข้อความทับรูปต้องระบุพาดหัวหลักอย่างน้อย 2 ตัวอักษร",
    });
  }
});

export const patchHeroSlideSchema = baseHeroSlideObject
  .partial()
  .superRefine((data, ctx) => {
    validateScheduleWindow(data.startsAt, data.endsAt, ctx);
    if (
      data.mode === "TEXT_OVERLAY" &&
      data.headline !== undefined &&
      data.headline.trim().length < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headline"],
        message: "โหมดข้อความทับรูปต้องระบุพาดหัวหลักอย่างน้อย 2 ตัวอักษร",
      });
    }
  });

export const reorderHeroSlidesSchema = z.object({
  orderedIds: z
    .array(z.string().trim().min(1))
    .min(1, "ต้องระบุรายการสไลด์อย่างน้อย 1 รายการ")
    .max(30),
});

export const updateEventPopupSchema = z
  .object({
    isActive: z.boolean().default(false),
    title: z.string().trim().max(160).default(""),
    imageUrl: optionalMediaUrlSchema,
    linkHref: optionalSafeHrefSchema,
    startsAt: optionalDateIsoSchema.default(null),
    endsAt: optionalDateIsoSchema.default(null),
  })
  .superRefine((data, ctx) => {
    validateScheduleWindow(data.startsAt, data.endsAt, ctx);
    if (data.isActive && data.imageUrl.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageUrl"],
        message: "กรุณาอัปโหลดรูปอีเวนต์ก่อนเปิดใช้งานป๊อปอัป",
      });
    }
  });

export type UpsertHeroSlideInput = z.infer<typeof upsertHeroSlideSchema>;
export type PatchHeroSlideInput = z.infer<typeof patchHeroSlideSchema>;
export type UpdateEventPopupInput = z.infer<typeof updateEventPopupSchema>;

export interface HeroSlideDto extends UpsertHeroSlideInput {
  id: string;
  updatedAt?: string;
}

export interface EventPopupDto extends UpdateEventPopupInput {
  id: string;
  updatedAt: string;
}
