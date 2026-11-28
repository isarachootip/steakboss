import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  optimizeUploadedImage,
  type ImageUploadPreset,
  type SupportedImageExt,
} from "./image-optimizer.service";

const SAFE_FILENAME_REGEX = /^[a-z0-9-]+\.(jpg|png|webp)$/;

const EXT_TO_CONTENT_TYPE: Record<SupportedImageExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function resolveUploadDir(customDir?: string): string {
  if (customDir) return customDir;
  if (process.env.UPLOAD_DIR?.trim()) return process.env.UPLOAD_DIR.trim();
  if (fsSync.existsSync("/app/data")) {
    return "/app/data/uploads";
  }
  return path.join(process.cwd(), "data", "uploads");
}

export interface SavedUploadResult {
  filename: string;
  url: string;
  contentType: string;
  bytes: number;
  originalBytes: number;
  width: number;
  height: number;
}

export async function saveUploadedImage(
  file: { buffer: Buffer; mimeType?: string; preset?: ImageUploadPreset },
  customDir?: string
): Promise<SavedUploadResult> {
  const optimized = await optimizeUploadedImage({
    buffer: file.buffer,
    preset: file.preset,
  });

  const dir = resolveUploadDir(customDir);
  await fs.mkdir(dir, { recursive: true });

  const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const filename = `${id}.${optimized.ext}`;
  const targetPath = path.join(dir, filename);
  await fs.writeFile(targetPath, optimized.buffer);

  return {
    filename,
    url: `/api/uploads/${filename}`,
    contentType: optimized.contentType,
    bytes: optimized.bytes,
    originalBytes: optimized.originalBytes,
    width: optimized.width,
    height: optimized.height,
  };
}

export async function readUploadedImage(
  filename: string,
  customDir?: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const clean = filename.trim().toLowerCase();
  if (!SAFE_FILENAME_REGEX.test(clean)) {
    return null;
  }

  const ext = clean.split(".").pop() as SupportedImageExt | undefined;
  if (!ext || !(ext in EXT_TO_CONTENT_TYPE)) {
    return null;
  }

  const dir = resolveUploadDir(customDir);
  const resolvedDir = path.resolve(dir);
  const fullPath = path.resolve(dir, clean);
  if (!fullPath.startsWith(resolvedDir + path.sep)) {
    return null;
  }

  try {
    const buffer = await fs.readFile(fullPath);
    return { buffer, contentType: EXT_TO_CONTENT_TYPE[ext] };
  } catch {
    return null;
  }
}
