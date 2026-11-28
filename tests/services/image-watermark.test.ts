import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  AD_DISCLAIMER_TEXT,
  AD_WATERMARK_EXIF_MARKER,
  applyAdDisclaimerWatermark,
  buildAdWatermarkSvg,
  computeWatermarkLayout,
  hasAdWatermarkMarker,
} from "@/services/image-watermark.service";

async function createSolidJpeg(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("image-watermark.service", () => {
  it("computes responsive top-center watermark layout for common product dimensions", () => {
    const sq720 = computeWatermarkLayout(720, 720);
    const land960 = computeWatermarkLayout(960, 717);
    const wide1600 = computeWatermarkLayout(1600, 893);

    expect(sq720.fontSize).toBeGreaterThanOrEqual(20);
    expect(sq720.baselineY).toBeGreaterThan(sq720.fontSize);
    expect(sq720.baselineY).toBeLessThan(Math.round(720 * 0.12));

    expect(land960.fontSize).toBeGreaterThanOrEqual(22);
    expect(wide1600.fontSize).toBeGreaterThan(sq720.fontSize);
    expect(wide1600.strokeWidth).toBeGreaterThanOrEqual(2);
  });

  it("rejects non-positive image dimensions", () => {
    expect(() => computeWatermarkLayout(0, 720)).toThrow();
    expect(() => computeWatermarkLayout(720, -10)).toThrow();
  });

  it("builds a minimal top-center SVG with escaped text and no background rectangle", () => {
    const svg = buildAdWatermarkSvg(900, 900).toString("utf8");
    expect(svg).toContain(AD_DISCLAIMER_TEXT);
    expect(svg).toContain('x="50%"');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).not.toContain("<rect");

    const escaped = buildAdWatermarkSvg(800, 600, "A & <B>").toString("utf8");
    expect(escaped).toContain("A &amp; &lt;B&gt;");
  });

  it("stamps top-center pixels, embeds EXIF marker, and stays idempotent on repeat runs", async () => {
    const original = await createSolidJpeg(720, 720, { r: 20, g: 20, b: 20 });
    expect(await hasAdWatermarkMarker(original)).toBe(false);

    const first = await applyAdDisclaimerWatermark(original);
    expect(first.applied).toBe(true);
    expect(first.width).toBe(720);
    expect(first.height).toBe(720);
    expect(await hasAdWatermarkMarker(first.buffer)).toBe(true);

    // Top-center strip should contain bright pixels from the white text
    const topCrop = await sharp(first.buffer)
      .extract({ left: 200, top: 0, width: 320, height: 70 })
      .toBuffer();
    const topCenterStats = await sharp(topCrop).stats();
    expect(topCenterStats.channels[0]?.max ?? 0).toBeGreaterThan(180);

    // Bottom-center strip should stay dark and untouched
    const bottomCrop = await sharp(first.buffer)
      .extract({ left: 200, top: 620, width: 320, height: 80 })
      .toBuffer();
    const bottomCenterStats = await sharp(bottomCrop).stats();
    expect(bottomCenterStats.channels[0]?.max ?? 255).toBeLessThan(40);

    // Second run without force should skip
    const second = await applyAdDisclaimerWatermark(first.buffer);
    expect(second.applied).toBe(false);
    expect(second.buffer.equals(first.buffer)).toBe(true);

    // Explicit force re-applies
    const forced = await applyAdDisclaimerWatermark(first.buffer, { force: true });
    expect(forced.applied).toBe(true);
    expect(await hasAdWatermarkMarker(forced.buffer)).toBe(true);
  });

  it("verifies every product image in public/images/products carries the watermark marker", async () => {
    const dir = path.join(process.cwd(), "public/images/products");
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(54);

    const missing: string[] = [];
    for (const file of files) {
      const buf = fs.readFileSync(path.join(dir, file));
      const marked = await hasAdWatermarkMarker(buf);
      if (!marked) missing.push(file);
    }

    expect(
      missing,
      `Images missing ${AD_WATERMARK_EXIF_MARKER}: ${missing.join(", ")}`
    ).toEqual([]);
  });
});
