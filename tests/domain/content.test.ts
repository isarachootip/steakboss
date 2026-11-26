import { describe, expect, it } from "vitest";
import {
  landingContentSchema,
  upsertCookingGuideSchema,
} from "@/schemas/content.schema";
import {
  DEFAULT_COOKING_GUIDES,
  DEFAULT_LANDING_CONTENT,
  formatGuideChatReply,
  matchGuideForChatQuery,
  resolveVideoEmbed,
} from "@/domain/content-defaults";

describe("content schemas & domain helpers", () => {
  it("validates default landing content and rejects unsafe CTA links", () => {
    const parsed = landingContentSchema.safeParse(DEFAULT_LANDING_CONTENT);
    expect(parsed.success).toBe(true);

    const bad = landingContentSchema.safeParse({
      ...DEFAULT_LANDING_CONTENT,
      primaryCtaHref: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
  });

  it("validates cooking guide schema and enforces clean slugs and non-empty steps", () => {
    const first = DEFAULT_COOKING_GUIDES[0]!;
    const ok = upsertCookingGuideSchema.safeParse(first);
    expect(ok.success).toBe(true);

    const badSlug = upsertCookingGuideSchema.safeParse({
      ...first,
      slug: "Air Fryer!!",
    });
    expect(badSlug.success).toBe(false);

    const emptySteps = upsertCookingGuideSchema.safeParse({
      ...first,
      steps: [],
    });
    expect(emptySteps.success).toBe(false);
  });

  it("includes all 4 preset cooking guides by default", () => {
    const slugs = DEFAULT_COOKING_GUIDES.map((g) => g.slug);
    expect(slugs).toEqual([
      "air-fryer",
      "pan-grill",
      "thawing-guide",
      "microwave-oven",
    ]);
  });

  it("resolves YouTube watch, shorts, youtu.be, and external TikTok/Reels URLs safely", () => {
    const watch = resolveVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(watch).toEqual({
      kind: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platformLabel: "YouTube",
    });

    const shorts = resolveVideoEmbed("https://www.youtube.com/shorts/abc123XYZ_-?feature=share");
    expect(shorts).toMatchObject({
      kind: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/abc123XYZ_-",
    });

    const shortLink = resolveVideoEmbed("https://youtu.be/dQw4w9WgXcQ?t=12");
    expect(shortLink).toMatchObject({
      kind: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });

    const tiktok = resolveVideoEmbed("https://www.tiktok.com/@steakboss/video/123456789");
    expect(tiktok).toEqual({
      kind: "external",
      externalUrl: "https://www.tiktok.com/@steakboss/video/123456789",
      platformLabel: "TikTok",
    });

    expect(resolveVideoEmbed("")).toBeNull();
    expect(resolveVideoEmbed("javascript:alert(1)")).toBeNull();
  });

  it("matches customer cooking questions to the right guide and formats reply with link", () => {
    const guides = DEFAULT_COOKING_GUIDES.map((g, idx) => ({
      ...g,
      id: `g-${idx}`,
    }));

    expect(matchGuideForChatQuery("ใช้หม้อทอดไร้น้ำมันไฟเท่าไหร่", guides)?.slug).toBe("air-fryer");
    expect(matchGuideForChatQuery("ทอดกระทะเทฟลอนกี่นาที", guides)?.slug).toBe("pan-grill");
    expect(matchGuideForChatQuery("วิธีละลายน้ำแข็งก่อนย่าง", guides)?.slug).toBe("thawing-guide");
    expect(matchGuideForChatQuery("อยู่หอพัก อุ่นไมโครเวฟได้ไหม", guides)?.slug).toBe("microwave-oven");
    expect(matchGuideForChatQuery("ค่าส่งเท่าไหร่ครับ", guides)).toBeNull();

    const airFryer = guides[0]!;
    const reply = formatGuideChatReply(airFryer, "https://steakboss.odmfood.online");
    expect(reply).toContain(airFryer.tempLabel);
    expect(reply).toContain(airFryer.durationLabel);
    expect(reply).toContain("https://steakboss.odmfood.online/guides/air-fryer");
  });
});
