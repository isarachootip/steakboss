import sharp from "sharp";

export const AD_DISCLAIMER_TEXT = "รูปเพื่อการโฆษณา";
export const AD_WATERMARK_EXIF_MARKER = "STEAKBOSS_AD_WATERMARK_V1";

const DEFAULT_FONT_FAMILY = "Leelawadee UI, Tahoma, sans-serif";

export interface WatermarkLayout {
  fontSize: number;
  strokeWidth: number;
  baselineY: number;
  shadowOffsetY: number;
  shadowBlur: number;
}

export interface ApplyWatermarkOptions {
  force?: boolean;
  text?: string;
  quality?: number;
}

export interface ApplyWatermarkResult {
  buffer: Buffer;
  applied: boolean;
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function computeWatermarkLayout(
  width: number,
  height: number
): WatermarkLayout {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }

  const base = Math.min(width, height);
  const fontSize = Math.round(Math.max(20, Math.min(36, base * 0.036)));
  const strokeWidth = Math.max(2.2, Number((fontSize * 0.12).toFixed(1)));
  const topMargin = Math.max(8, Math.round(height * 0.012));
  const baselineY = Math.round(fontSize * 1.18 + topMargin);

  return {
    fontSize,
    strokeWidth,
    baselineY,
    shadowOffsetY: Number(Math.max(1, fontSize * 0.05).toFixed(1)),
    shadowBlur: Number(Math.max(1.5, fontSize * 0.07).toFixed(1)),
  };
}

export function buildAdWatermarkSvg(
  width: number,
  height: number,
  text: string = AD_DISCLAIMER_TEXT
): Buffer {
  const layout = computeWatermarkLayout(width, height);
  const safeText = escapeXml(text);

  const svg = [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    `  <defs>`,
    `    <filter id="sb-ad-shadow" x="-20%" y="-20%" width="140%" height="140%">`,
    `      <feDropShadow dx="0" dy="${layout.shadowOffsetY}" stdDeviation="${layout.shadowBlur}" flood-color="#000000" flood-opacity="0.72" />`,
    `    </filter>`,
    `  </defs>`,
    `  <text x="50%" y="${layout.baselineY}" text-anchor="middle" font-family="${DEFAULT_FONT_FAMILY}" font-size="${layout.fontSize}" font-weight="700" fill="none" stroke="rgba(0,0,0,0.78)" stroke-width="${layout.strokeWidth}" stroke-linejoin="round" filter="url(#sb-ad-shadow)">${safeText}</text>`,
    `  <text x="50%" y="${layout.baselineY}" text-anchor="middle" font-family="${DEFAULT_FONT_FAMILY}" font-size="${layout.fontSize}" font-weight="700" fill="rgba(255,255,255,0.96)">${safeText}</text>`,
    `</svg>`,
  ].join("\n");

  return Buffer.from(svg, "utf8");
}

export async function hasAdWatermarkMarker(buffer: Buffer): Promise<boolean> {
  const meta = await sharp(buffer).metadata();
  if (!meta.exif) return false;
  return meta.exif.toString("latin1").includes(AD_WATERMARK_EXIF_MARKER);
}

export async function applyAdDisclaimerWatermark(
  buffer: Buffer,
  options: ApplyWatermarkOptions = {}
): Promise<ApplyWatermarkResult> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new Error("Cannot read valid image dimensions for watermarking");
  }

  const alreadyMarked =
    meta.exif !== undefined &&
    meta.exif.toString("latin1").includes(AD_WATERMARK_EXIF_MARKER);

  if (alreadyMarked && !options.force) {
    return { buffer, applied: false, width, height };
  }

  const svgOverlay = buildAdWatermarkSvg(width, height, options.text);
  const quality = options.quality ?? 88;

  let pipeline = sharp(buffer)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .withExifMerge({
      IFD0: { ImageDescription: AD_WATERMARK_EXIF_MARKER },
    });

  switch (meta.format) {
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    default:
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
  }

  const output = await pipeline.toBuffer();
  return { buffer: output, applied: true, width, height };
}
