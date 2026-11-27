import { describe, expect, it } from "vitest";
import {
  createHeroSlide,
  deleteHeroSlide,
  getEventPopup,
  getVisibleEventPopup,
  listAllHeroSlidesAdmin,
  listVisibleHeroSlides,
  reorderHeroSlides,
  resetEventPopup,
  updateEventPopup,
  updateHeroSlide,
} from "@/services/promo.service";

describe("promo.service (HeroSlide & EventPopup)", () => {
  it("supports full HeroSlide CRUD, reordering, and visibility filtering", async () => {
    const s1 = await createHeroSlide({
      mode: "IMAGE_BANNER",
      title: "Test Banner 1",
      imageUrl: "/images/products/hero.jpg",
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
      sortOrder: 90,
      isActive: true,
      startsAt: null,
      endsAt: null,
    });

    const s2 = await createHeroSlide({
      mode: "TEXT_OVERLAY",
      title: "Test Overlay 2",
      imageUrl: "/images/products/hero.jpg",
      eyebrow: "พิเศษ",
      headline: "สเต็กทดสอบ",
      subheadline: "นุ่มฉ่ำ",
      packCardImgUrl: "",
      packCardCaption: "",
      badges: ["ส่งฟรี"],
      primaryCtaLabel: "สั่งเลย",
      primaryCtaHref: "#menu",
      secondaryCtaLabel: "",
      secondaryCtaHref: "",
      linkHref: "",
      sortOrder: 91,
      isActive: true,
      startsAt: null,
      endsAt: null,
    });

    try {
      const adminList = await listAllHeroSlidesAdmin();
      expect(adminList.some((x) => x.id === s1.id)).toBe(true);
      expect(adminList.some((x) => x.id === s2.id)).toBe(true);

      await reorderHeroSlides([s2.id, s1.id]);
      const reordered = await listAllHeroSlidesAdmin();
      const idx2 = reordered.findIndex((x) => x.id === s2.id);
      const idx1 = reordered.findIndex((x) => x.id === s1.id);
      expect(idx2).toBeLessThan(idx1);

      const updated = await updateHeroSlide(s1.id, { isActive: false });
      expect(updated.isActive).toBe(false);

      const visible = await listVisibleHeroSlides();
      expect(visible.some((x) => x.id === s1.id)).toBe(false);
      expect(visible.some((x) => x.id === s2.id)).toBe(true);
    } finally {
      await deleteHeroSlide(s1.id).catch(() => undefined);
      await deleteHeroSlide(s2.id).catch(() => undefined);
    }
  });

  it("updates, resolves visibility, and resets singleton EventPopup", async () => {
    const before = await getEventPopup();
    try {
      const saved = await updateEventPopup({
        isActive: true,
        title: "อีเวนต์ทดสอบ",
        imageUrl: "/images/products/packcard.jpg",
        linkHref: "#menu",
        startsAt: null,
        endsAt: null,
      });
      expect(saved.isActive).toBe(true);
      expect(saved.imageUrl).toBe("/images/products/packcard.jpg");

      const visible = await getVisibleEventPopup();
      expect(visible?.title).toBe("อีเวนต์ทดสอบ");

      const cleared = await resetEventPopup();
      expect(cleared.isActive).toBe(false);
      expect(cleared.imageUrl).toBe("");
      expect(await getVisibleEventPopup()).toBeNull();
    } finally {
      await updateEventPopup({
        isActive: before.isActive,
        title: before.title,
        imageUrl: before.imageUrl,
        linkHref: before.linkHref,
        startsAt: before.startsAt,
        endsAt: before.endsAt,
      }).catch(() => resetEventPopup());
    }
  });
});
