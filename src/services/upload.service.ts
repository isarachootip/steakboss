import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const SAFE_FILENAME_REGEX = /^[a-z0-9-]+\.(jpg|png|webp)$/;

type SupportedExt = "jpg" | "png" | "webp";

const EXT_TO_CONTENT_TYPE: Record<SupportedExt, string> = {
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

function detectImageExtension(buf: Buffer): SupportedExt | null {
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

export async function saveUploadedImage(
  file: { buffer: Buffer; mimeType?: string },
  customDir?: string
): Promise<{ filename: string; url: string; contentType: string }> {
  if (file.buffer.length === 0) {
    throw new Error("ไม่พบข้อมูลไฟล์รูปภาพ");
  }
  if (file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB");
  }

  const ext = detectImageExtension(file.buffer);
  if (!ext) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพจริงนามสกุล JPG, PNG หรือ WEBP เท่านั้น");
  }

  const dir = resolveUploadDir(customDir);
  await fs.mkdir(dir, { recursive: true });

  const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const filename = `${id}.${ext}`;
  const targetPath = path.join(dir, filename);
  await fs.writeFile(targetPath, file.buffer);

  return {
    filename,
    url: `/api/uploads/${filename}`,
    contentType: EXT_TO_CONTENT_TYPE[ext],
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

  const ext = clean.split(".").pop() as SupportedExt | undefined;
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
