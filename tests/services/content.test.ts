import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCookingGuide,
  deleteCookingGuide,
  getLandingContent,
  getPublishedGuideBySlug,
  listAllGuidesAdmin,
  listPublishedGuides,
  resetLandingContent,
  updateCookingGuide,
  updateLandingContent,
} from "@/services/content.service";
import { readUploadedImage, saveUploadedImage } from "@/services/upload.service";
import { DEFAULT_LANDING_CONTENT } from "@/domain/content-defaults";

describe("content.service & upload.service", () => {
  it("updates and resets singleton landing content cleanly", async () => {
    const updated = await updateLandingContent({
      ...DEFAULT_LANDING_CONTENT,
      eyebrow: "โปรพิเศษเฉพาะเดือนนี้",
      headline: "สเต็กหมักนุ่ม\nพร้อมส่งทั่วไทย",
    });
    expect(updated.eyebrow).toBe("โปรพิเศษเฉพาะเดือนนี้");

    const loaded = await getLandingContent();
    expect(loaded.headline).toBe("สเต็กหมักนุ่ม\nพร้อมส่งทั่วไทย");

    const reset = await resetLandingContent();
    expect(reset.eyebrow).toBe(DEFAULT_LANDING_CONTENT.eyebrow);
  });

  it("enforces draft vs published visibility on cooking guides", async () => {
    const testSlug = `test-guide-${Date.now()}`;
    const created = await createCookingGuide({
      slug: testSlug,
      title: "สูตรทดสอบย่างเตาถ่าน",
      equipmentLabel: "เตาถ่าน",
      summary: "ย่างเตาถ่านหอมควันไฟ",
      tempLabel: "ไฟปานกลาง",
      durationLabel: "10 นาที",
      coverImgUrl: "",
      videoUrl: "",
      steps: [{ title: "ก่อไฟ", description: "รอจนถ่านแดงไม่มีควันดำ", imageUrl: "" }],
      tips: ["ทาเนยตอนจบ"],
      sortOrder: 99,
      isPublished: false,
    });

    try {
      const pubBefore = await getPublishedGuideBySlug(testSlug);
      expect(pubBefore).toBeNull();

      const allAdmin = await listAllGuidesAdmin();
      expect(allAdmin.some((g) => g.id === created.id)).toBe(true);

      await updateCookingGuide(created.id, { isPublished: true });
      const pubAfter = await getPublishedGuideBySlug(testSlug);
      expect(pubAfter?.title).toBe("สูตรทดสอบย่างเตาถ่าน");

      const publishedList = await listPublishedGuides();
      expect(publishedList.some((g) => g.slug === testSlug)).toBe(true);
    } finally {
      await deleteCookingGuide(created.id);
    }
  });

  it("validates image magic bytes and blocks path traversal on uploads", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sb-uploads-"));
    try {
      // Minimal valid 1x1 transparent PNG
      const pngBytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      const saved = await saveUploadedImage(
        { buffer: pngBytes, mimeType: "image/png" },
        tmpDir
      );
      expect(saved.url).toMatch(/^\/api\/uploads\/[a-z0-9-]+\.png$/);

      const loaded = await readUploadedImage(saved.filename, tmpDir);
      expect(loaded?.contentType).toBe("image/png");
      expect(loaded?.buffer.length).toBeGreaterThan(0);
      expect(loaded?.buffer.length).toBeLessThanOrEqual(1_048_576);

      await expect(
        saveUploadedImage(
          { buffer: Buffer.from("not-a-real-image"), mimeType: "image/png" },
          tmpDir
        )
      ).rejects.toThrow();

      const traversal = await readUploadedImage("../dev.db", tmpDir);
      expect(traversal).toBeNull();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
