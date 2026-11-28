import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  MAX_SAVED_IMAGE_BYTES,
  optimizeUploadedImage,
} from "@/services/image-optimizer.service";
import { saveUploadedImage } from "@/services/upload.service";

describe("upload & image-optimizer service (<= 1 MB guarantee)", () => {
  it("resizes and compresses a > 2 MB high-entropy image down to <= 1 MB and respects preset max dimensions", async () => {
    const width = 2400;
    const height = 1800;
    const noise = crypto.randomBytes(width * height * 3);
    const hugePng = await sharp(noise, { raw: { width, height, channels: 3 } })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(hugePng.length).toBeGreaterThan(2 * 1024 * 1024);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sb-upload-test-"));
    try {
      const savedProduct = await saveUploadedImage(
        { buffer: hugePng, mimeType: "image/png", preset: "product" },
        tmpDir
      );
      expect(savedProduct.bytes).toBeLessThanOrEqual(MAX_SAVED_IMAGE_BYTES);
      expect(savedProduct.width).toBeLessThanOrEqual(1200);
      expect(savedProduct.height).toBeLessThanOrEqual(1200);

      const onDisk = await fs.readFile(path.join(tmpDir, savedProduct.filename));
      expect(onDisk.length).toBeLessThanOrEqual(MAX_SAVED_IMAGE_BYTES);

      const savedBanner = await optimizeUploadedImage({
        buffer: hugePng,
        preset: "banner",
      });
      expect(savedBanner.bytes).toBeLessThanOrEqual(MAX_SAVED_IMAGE_BYTES);
      expect(savedBanner.width).toBeLessThanOrEqual(1600);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("preserves small transparent PNGs and rejects non-image payloads", async () => {
    const transparentPng = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 255, g: 180, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeUploadedImage({
      buffer: transparentPng,
      preset: "product",
    });
    expect(result.ext).toBe("png");
    expect(result.bytes).toBeLessThanOrEqual(MAX_SAVED_IMAGE_BYTES);

    await expect(
      optimizeUploadedImage({
        buffer: Buffer.from("not an image file"),
        preset: "product",
      })
    ).rejects.toThrow(/JPG, PNG หรือ WEBP/);
  });
});
