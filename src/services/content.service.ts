import type { CookingGuide, LandingContent } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEFAULT_LANDING_CONTENT } from "@/domain/content-defaults";
import {
  cookingStepSchema,
  landingContentSchema,
  type CookingGuideDto,
  type CookingStep,
  type LandingContentInput,
  type PatchCookingGuideInput,
  type UpsertCookingGuideInput,
} from "@/schemas/content.schema";

const stringArraySchema = z.array(z.string().trim().min(1));
const stepsArraySchema = z.array(cookingStepSchema);

function safeParseJson<T>(
  raw: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: T
): T {
  try {
    const parsed: unknown = JSON.parse(raw);
    const checked = schema.safeParse(parsed);
    return checked.success ? checked.data : fallback;
  } catch {
    return fallback;
  }
}

function mapLandingRow(row: LandingContent | null): LandingContentInput {
  if (!row) return DEFAULT_LANDING_CONTENT;
  const badges = safeParseJson(
    row.badgesJson,
    stringArraySchema,
    DEFAULT_LANDING_CONTENT.badges
  );
  const candidate: LandingContentInput = {
    eyebrow: row.eyebrow || DEFAULT_LANDING_CONTENT.eyebrow,
    headline: row.headline || DEFAULT_LANDING_CONTENT.headline,
    subheadline: row.subheadline || DEFAULT_LANDING_CONTENT.subheadline,
    heroImgUrl: row.heroImgUrl || DEFAULT_LANDING_CONTENT.heroImgUrl,
    heroImgAlt: row.heroImgAlt || DEFAULT_LANDING_CONTENT.heroImgAlt,
    packCardImgUrl: row.packCardImgUrl || DEFAULT_LANDING_CONTENT.packCardImgUrl,
    packCardCaption: row.packCardCaption || DEFAULT_LANDING_CONTENT.packCardCaption,
    badges: badges.length > 0 ? badges : DEFAULT_LANDING_CONTENT.badges,
    primaryCtaLabel: row.primaryCtaLabel || DEFAULT_LANDING_CONTENT.primaryCtaLabel,
    primaryCtaHref: row.primaryCtaHref || DEFAULT_LANDING_CONTENT.primaryCtaHref,
    secondaryCtaLabel: row.secondaryCtaLabel || DEFAULT_LANDING_CONTENT.secondaryCtaLabel,
    secondaryCtaHref: row.secondaryCtaHref || DEFAULT_LANDING_CONTENT.secondaryCtaHref,
  };
  const checked = landingContentSchema.safeParse(candidate);
  return checked.success ? checked.data : DEFAULT_LANDING_CONTENT;
}

function mapGuideRow(row: CookingGuide): CookingGuideDto {
  const steps: CookingStep[] = safeParseJson(row.stepsJson, stepsArraySchema, []);
  const tips: string[] = safeParseJson(row.tipsJson, stringArraySchema, []);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    equipmentLabel: row.equipmentLabel,
    summary: row.summary,
    tempLabel: row.tempLabel,
    durationLabel: row.durationLabel,
    coverImgUrl: row.coverImgUrl,
    videoUrl: row.videoUrl,
    steps,
    tips,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getLandingContent(): Promise<LandingContentInput> {
  const row = await db.landingContent.findUnique({ where: { id: "default" } });
  return mapLandingRow(row);
}

export async function updateLandingContent(
  input: LandingContentInput
): Promise<LandingContentInput> {
  const { badges, ...rest } = input;
  const data = { ...rest, badgesJson: JSON.stringify(badges) };
  const row = await db.landingContent.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  return mapLandingRow(row);
}

export async function resetLandingContent(): Promise<LandingContentInput> {
  return updateLandingContent(DEFAULT_LANDING_CONTENT);
}

export async function listPublishedGuides(): Promise<CookingGuideDto[]> {
  const rows = await db.cookingGuide.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapGuideRow);
}

export async function listAllGuidesAdmin(): Promise<CookingGuideDto[]> {
  const rows = await db.cookingGuide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapGuideRow);
}

export async function getPublishedGuideBySlug(
  slug: string
): Promise<CookingGuideDto | null> {
  const row = await db.cookingGuide.findUnique({ where: { slug } });
  if (!row || !row.isPublished) return null;
  return mapGuideRow(row);
}

export async function createCookingGuide(
  input: UpsertCookingGuideInput
): Promise<CookingGuideDto> {
  const existing = await db.cookingGuide.findUnique({ where: { slug: input.slug } });
  if (existing) {
    throw new Error(`มีคู่มือที่ใช้ slug "${input.slug}" อยู่แล้ว กรุณาเปลี่ยนชื่อลิงก์`);
  }
  const { steps, tips, ...rest } = input;
  const row = await db.cookingGuide.create({
    data: {
      ...rest,
      stepsJson: JSON.stringify(steps),
      tipsJson: JSON.stringify(tips),
    },
  });
  return mapGuideRow(row);
}

export async function updateCookingGuide(
  id: string,
  input: PatchCookingGuideInput
): Promise<CookingGuideDto> {
  if (input.slug) {
    const conflict = await db.cookingGuide.findFirst({
      where: { slug: input.slug, NOT: { id } },
    });
    if (conflict) {
      throw new Error(`slug "${input.slug}" ซ้ำกับคู่มืออื่น`);
    }
  }
  const { steps, tips, ...rest } = input;
  const row = await db.cookingGuide.update({
    where: { id },
    data: {
      ...rest,
      ...(steps !== undefined ? { stepsJson: JSON.stringify(steps) } : {}),
      ...(tips !== undefined ? { tipsJson: JSON.stringify(tips) } : {}),
    },
  });
  return mapGuideRow(row);
}

export async function deleteCookingGuide(id: string): Promise<void> {
  await db.cookingGuide.delete({ where: { id } });
}
