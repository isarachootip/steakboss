import sharp, { type Metadata } from "sharp";

export type ImageUploadPreset = "product" | "banner";
export type SupportedImageExt = "jpg" | "png" | "webp";

export const MAX_SAVED_IMAGE_BYTES = 1_048_576; // 1 MB
export const MAX_INPUT_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

const PRESET_MAX_DIM: Record<ImageUploadPreset, number> = {
  product: 1200,
  banner: 1600,
};

export interface OptimizedImageResult {
  buffer: Buffer;
  ext: SupportedImageExt;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
}

const EXT_CONTENT_TYPE: Record<SupportedImageExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function detectImageExtension(buf: Buffer): SupportedImageExt | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export function resolveUploadPreset(raw: unknown): ImageUploadPreset {
  return raw === "banner" ? "banner" : "product";
}

export async function optimizeUploadedImage(params: {
  buffer: Buffer;
  preset?: ImageUploadPreset;
  maxBytes?: number;
}): Promise<OptimizedImageResult> {
  const originalBytes = params.buffer.length;
  const maxBytes = params.maxBytes ?? MAX_SAVED_IMAGE_BYTES;
  const preset = params.preset ?? "product";

  if (originalBytes === 0) {
    throw new Error("ไม่พบข้อมูลไฟล์รูปภาพ");
  }
  if (originalBytes > MAX_INPUT_IMAGE_BYTES) {
    throw new Error("ขนาดไฟล์ต้นฉบับต้องไม่เกิน 15 MB");
  }

  const inputExt = detectImageExtension(params.buffer);
  if (!inputExt) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพจริงนามสกุล JPG, PNG หรือ WEBP เท่านั้น");
  }

  let meta: Metadata;
  try {
    meta = await sharp(params.buffer).metadata();
  } catch {
    throw new Error("ไฟล์รูปภาพเสียหายหรือไม่สามารถอ่านได้ กรุณาเลือกรูปใหม่");
  }
  const initialMaxDim = PRESET_MAX_DIM[preset];

  if (inputExt === "png" && meta.hasAlpha) {
    const pngAttempt = await sharp(params.buffer)
      .rotate()
      .resize(initialMaxDim, initialMaxDim, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer({ resolveWithObject: true });

    if (pngAttempt.data.length <= maxBytes) {
      return {
        buffer: pngAttempt.data,
        ext: "png",
        contentType: EXT_CONTENT_TYPE.png,
        width: pngAttempt.info.width,
        height: pngAttempt.info.height,
        bytes: pngAttempt.data.length,
        originalBytes,
      };
    }
  }

  const dimSteps = Array.from(
    new Set([initialMaxDim, Math.min(initialMaxDim, 1080), 860, 640])
  );
  const qualitySteps = [84, 76, 66, 54, 42];

  for (const dim of dimSteps) {
    for (const quality of qualitySteps) {
      const attempt = await sharp(params.buffer)
        .rotate()
        .resize(dim, dim, { fit: "inside", withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      if (attempt.data.length <= maxBytes) {
        return {
          buffer: attempt.data,
          ext: "webp",
          contentType: EXT_CONTENT_TYPE.webp,
          width: attempt.info.width,
          height: attempt.info.height,
          bytes: attempt.data.length,
          originalBytes,
        };
      }
    }
  }

  throw new Error("ไม่สามารถบีบอัดรูปภาพให้ต่ำกว่า 1 MB ได้ กรุณาเลือกรูปที่มีขนาดเล็กลง");
}
