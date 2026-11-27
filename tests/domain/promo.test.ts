import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING_CONTENT } from "@/domain/content-defaults";
import {
  isEventPopupVisible,
  isWithinSchedule,
  resolveVisibleHeroSlides,
} from "@/domain/promo-rules";
import {
  updateEventPopupSchema,
  upsertHeroSlideSchema,
  type EventPopupDto,
  type HeroSlideDto,
} from "@/schemas/promo.schema";

describe("promo schemas & domain rules", () => {
  it("validates TEXT_OVERLAY vs IMAGE_BANNER slide modes and rejects unsafe links", () => {
    const banner = upsertHeroSlideSchema.safeParse({
      mode: "IMAGE_BANNER",
      title: "โปรสเต็กสงกรานต์",
      imageUrl: "/api/uploads/songkran.jpg",
      linkHref: "#menu",
    });
    expect(banner.success).toBe(true);

    const missingHeadlineOverlay = upsertHeroSlideSchema.safeParse({
      mode: "TEXT_OVERLAY",
      title: "Hero หลัก",
      imageUrl: "/images/products/hero.jpg",
      headline: "",
    });
    expect(missingHeadlineOverlay.success).toBe(false);

    const unsafeLink = upsertHeroSlideSchema.safeParse({
      mode: "IMAGE_BANNER",
      title: "Bad link",
      imageUrl: "/images/products/hero.jpg",
      linkHref: "javascript:alert(1)",
    });
    expect(unsafeLink.success).toBe(false);

    const badWindow = upsertHeroSlideSchema.safeParse({
      mode: "IMAGE_BANNER",
      title: "Bad schedule",
      imageUrl: "/images/products/hero.jpg",
      startsAt: "2026-12-10T10:00:00.000Z",
      endsAt: "2026-12-01T10:00:00.000Z",
    });
    expect(badWindow.success).toBe(false);
  });

  it("requires an image when enabling the Event Pop-up", () => {
    const invalidActive = updateEventPopupSchema.safeParse({
      isActive: true,
      title: "งานแฟร์",
      imageUrl: "",
      linkHref: "",
    });
    expect(invalidActive.success).toBe(false);

    const validInactive = updateEventPopupSchema.safeParse({
      isActive: false,
      title: "",
      imageUrl: "",
      linkHref: "",
    });
    expect(validInactive.success).toBe(true);
  });

  it("evaluates schedules, sorts visible slides, and falls back when 0 slides active", () => {
    const now = new Date("2026-12-05T12:00:00.000Z");
    expect(
      isWithinSchedule(
        "2026-12-01T00:00:00.000Z",
        "2026-12-10T00:00:00.000Z",
        now
      )
    ).toBe(true);
    expect(
      isWithinSchedule("2026-12-06T00:00:00.000Z", null, now)
    ).toBe(false);

    const slides: HeroSlideDto[] = [
      {
        id: "s-expired",
        mode: "IMAGE_BANNER",
        title: "หมดเวลาแล้ว",
        imageUrl: "/a.jpg",
        eyebrow: "",
        headline: "",
        subheadline: "",
        packCardImgUrl: "",
        packCardCaption: "",
        badges: [],
        primaryCtaLabel: "",
        primaryCtaHref: "",
        secondaryCtaLabel: "",
        secondaryCtaHref: "",
        linkHref: "",
        sortOrder: 0,
        isActive: true,
        startsAt: null,
        endsAt: "2026-12-01T00:00:00.000Z",
      },
      {
        id: "s-second",
        mode: "IMAGE_BANNER",
        title: "สไลด์ 2",
        imageUrl: "/b.jpg",
        eyebrow: "",
        headline: "",
        subheadline: "",
        packCardImgUrl: "",
        packCardCaption: "",
        badges: [],
        primaryCtaLabel: "",
        primaryCtaHref: "",
        secondaryCtaLabel: "",
        secondaryCtaHref: "",
        linkHref: "#menu",
        sortOrder: 2,
        isActive: true,
        startsAt: null,
        endsAt: null,
      },
      {
        id: "s-first",
        mode: "IMAGE_BANNER",
        title: "สไลด์ 1",
        imageUrl: "/c.jpg",
        eyebrow: "",
        headline: "",
        subheadline: "",
        packCardImgUrl: "",
        packCardCaption: "",
        badges: [],
        primaryCtaLabel: "",
        primaryCtaHref: "",
        secondaryCtaLabel: "",
        secondaryCtaHref: "",
        linkHref: "",
        sortOrder: 1,
        isActive: true,
        startsAt: "2026-12-01T00:00:00.000Z",
        endsAt: "2026-12-10T00:00:00.000Z",
      },
    ];

    const visible = resolveVisibleHeroSlides(slides, DEFAULT_LANDING_CONTENT, now);
    expect(visible.map((s) => s.id)).toEqual(["s-first", "s-second"]);

    const fallback = resolveVisibleHeroSlides(
      [slides[0]!],
      DEFAULT_LANDING_CONTENT,
      now
    );
    expect(fallback).toHaveLength(1);
    expect(fallback[0]!.id).toBe("fallback-default-hero");
    expect(fallback[0]!.headline).toBe(DEFAULT_LANDING_CONTENT.headline);
  });

  it("hides Event Pop-up when inactive, missing image, or outside schedule", () => {
    const now = new Date("2026-12-05T12:00:00.000Z");
    const base: EventPopupDto = {
      id: "default",
      isActive: true,
      title: "Event",
      imageUrl: "/api/uploads/event.png",
      linkHref: "#menu",
      startsAt: "2026-12-01T00:00:00.000Z",
      endsAt: "2026-12-10T00:00:00.000Z",
      updatedAt: now.toISOString(),
    };
    expect(isEventPopupVisible(base, now)).toBe(true);
    expect(isEventPopupVisible({ ...base, isActive: false }, now)).toBe(false);
    expect(isEventPopupVisible({ ...base, imageUrl: "" }, now)).toBe(false);
    expect(
      isEventPopupVisible({ ...base, endsAt: "2026-12-04T00:00:00.000Z" }, now)
    ).toBe(false);
  });
});
