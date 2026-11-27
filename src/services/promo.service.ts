import type { EventPopup, HeroSlide } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  isEventPopupVisible,
  resolveVisibleHeroSlides,
} from "@/domain/promo-rules";
import {
  heroSlideModeSchema,
  type EventPopupDto,
  type HeroSlideDto,
  type PatchHeroSlideInput,
  type UpdateEventPopupInput,
  type UpsertHeroSlideInput,
} from "@/schemas/promo.schema";
import { getLandingContent } from "./content.service";

const stringArraySchema = z.array(z.string().trim().min(1));

function parseBadges(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    const checked = stringArraySchema.safeParse(parsed);
    return checked.success ? checked.data : [];
  } catch {
    return [];
  }
}

function mapSlideRow(row: HeroSlide): HeroSlideDto {
  const mode = heroSlideModeSchema.safeParse(row.mode);
  return {
    id: row.id,
    mode: mode.success ? mode.data : "TEXT_OVERLAY",
    title: row.title,
    imageUrl: row.imageUrl,
    eyebrow: row.eyebrow,
    headline: row.headline,
    subheadline: row.subheadline,
    packCardImgUrl: row.packCardImgUrl,
    packCardCaption: row.packCardCaption,
    badges: parseBadges(row.badgesJson),
    primaryCtaLabel: row.primaryCtaLabel,
    primaryCtaHref: row.primaryCtaHref,
    secondaryCtaLabel: row.secondaryCtaLabel,
    secondaryCtaHref: row.secondaryCtaHref,
    linkHref: row.linkHref,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPopupRow(row: EventPopup | null): EventPopupDto {
  if (!row) {
    return {
      id: "default",
      isActive: false,
      title: "",
      imageUrl: "",
      linkHref: "",
      startsAt: null,
      endsAt: null,
      updatedAt: new Date(0).toISOString(),
    };
  }
  return {
    id: row.id,
    isActive: row.isActive,
    title: row.title,
    imageUrl: row.imageUrl,
    linkHref: row.linkHref,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAllHeroSlidesAdmin(): Promise<HeroSlideDto[]> {
  const rows = await db.heroSlide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapSlideRow);
}

export async function listVisibleHeroSlides(
  now: Date = new Date()
): Promise<HeroSlideDto[]> {
  const [rows, landing] = await Promise.all([
    db.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getLandingContent(),
  ]);
  return resolveVisibleHeroSlides(rows.map(mapSlideRow), landing, now);
}

export async function createHeroSlide(
  input: UpsertHeroSlideInput
): Promise<HeroSlideDto> {
  const { badges, startsAt, endsAt, ...rest } = input;
  const row = await db.heroSlide.create({
    data: {
      ...rest,
      badgesJson: JSON.stringify(badges),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  return mapSlideRow(row);
}

export async function updateHeroSlide(
  id: string,
  input: PatchHeroSlideInput
): Promise<HeroSlideDto> {
  const { badges, startsAt, endsAt, ...rest } = input;
  const row = await db.heroSlide.update({
    where: { id },
    data: {
      ...rest,
      ...(badges !== undefined ? { badgesJson: JSON.stringify(badges) } : {}),
      ...(startsAt !== undefined
        ? { startsAt: startsAt ? new Date(startsAt) : null }
        : {}),
      ...(endsAt !== undefined
        ? { endsAt: endsAt ? new Date(endsAt) : null }
        : {}),
    },
  });
  return mapSlideRow(row);
}

export async function reorderHeroSlides(orderedIds: string[]): Promise<HeroSlideDto[]> {
  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.heroSlide.update({
        where: { id },
        data: { sortOrder: idx },
      })
    )
  );
  return listAllHeroSlidesAdmin();
}

export async function deleteHeroSlide(id: string): Promise<void> {
  await db.heroSlide.delete({ where: { id } });
}

export async function getEventPopup(): Promise<EventPopupDto> {
  const row = await db.eventPopup.findUnique({ where: { id: "default" } });
  return mapPopupRow(row);
}

export async function getVisibleEventPopup(
  now: Date = new Date()
): Promise<EventPopupDto | null> {
  const popup = await getEventPopup();
  return isEventPopupVisible(popup, now) ? popup : null;
}

export async function updateEventPopup(
  input: UpdateEventPopupInput
): Promise<EventPopupDto> {
  const data = {
    isActive: input.isActive,
    title: input.title,
    imageUrl: input.imageUrl,
    linkHref: input.linkHref,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
  const row = await db.eventPopup.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  return mapPopupRow(row);
}

export async function resetEventPopup(): Promise<EventPopupDto> {
  return updateEventPopup({
    isActive: false,
    title: "",
    imageUrl: "",
    linkHref: "",
    startsAt: null,
    endsAt: null,
  });
}
