import type { LandingContentInput } from "@/schemas/content.schema";
import type { EventPopupDto, HeroSlideDto } from "@/schemas/promo.schema";

export function isWithinSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const nowMs = now.getTime();
  if (startsAt) {
    const startMs = Date.parse(startsAt);
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return false;
    }
  }
  if (endsAt) {
    const endMs = Date.parse(endsAt);
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      return false;
    }
  }
  return true;
}

export function landingToFallbackSlide(
  landing: LandingContentInput
): HeroSlideDto {
  return {
    id: "fallback-default-hero",
    mode: "TEXT_OVERLAY",
    title: landing.heroImgAlt,
    imageUrl: landing.heroImgUrl,
    eyebrow: landing.eyebrow,
    headline: landing.headline,
    subheadline: landing.subheadline,
    packCardImgUrl: landing.packCardImgUrl,
    packCardCaption: landing.packCardCaption,
    badges: landing.badges,
    primaryCtaLabel: landing.primaryCtaLabel,
    primaryCtaHref: landing.primaryCtaHref,
    secondaryCtaLabel: landing.secondaryCtaLabel,
    secondaryCtaHref: landing.secondaryCtaHref,
    linkHref: "",
    sortOrder: 0,
    isActive: true,
    startsAt: null,
    endsAt: null,
  };
}

export function resolveVisibleHeroSlides(
  slides: readonly HeroSlideDto[],
  fallbackLanding: LandingContentInput,
  now: Date = new Date()
): HeroSlideDto[] {
  const visible = slides
    .filter(
      (s) =>
        s.isActive &&
        s.imageUrl.trim().length > 0 &&
        isWithinSchedule(s.startsAt, s.endsAt, now)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (visible.length === 0) {
    return [landingToFallbackSlide(fallbackLanding)];
  }
  return visible;
}

export function isEventPopupVisible(
  popup: EventPopupDto | null | undefined,
  now: Date = new Date()
): boolean {
  if (!popup) return false;
  if (!popup.isActive) return false;
  if (popup.imageUrl.trim().length === 0) return false;
  return isWithinSchedule(popup.startsAt, popup.endsAt, now);
}
