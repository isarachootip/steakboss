export type ClientImagePreset = "product" | "banner" | "slip";

export const CLIENT_MAX_IMAGE_BYTES = 1_048_576; // 1 MB

const PRESET_MAX_DIM: Record<ClientImagePreset, number> = {
  product: 1200,
  banner: 1600,
  slip: 1200,
};

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function loadHtmlImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพนี้ได้"));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function drawScaled(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxDim: number
): HTMLCanvasElement {
  const ratio = Math.min(1, maxDim / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * ratio));
  const height = Math.max(1, Math.round(srcH * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับการย่อรูปผ่าน Canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

export async function resizeImageFileForUpload(
  file: File,
  options?: { preset?: ClientImagePreset; maxBytes?: number }
): Promise<{ file: File; originalBytes: number; resizedBytes: number }> {
  const preset = options?.preset ?? "product";
  const maxBytes = options?.maxBytes ?? CLIENT_MAX_IMAGE_BYTES;
  const originalBytes = file.size;
  const maxDim = PRESET_MAX_DIM[preset];

  const loaded = await loadHtmlImage(file);
  try {
    // Keep small PNGs intact so transparent logos/overlays pass straight to server
    if (
      preset !== "slip" &&
      file.type === "image/png" &&
      file.size <= maxBytes &&
      Math.max(loaded.width, loaded.height) <= maxDim
    ) {
      return { file, originalBytes, resizedBytes: file.size };
    }

    const preferMime = preset === "slip" ? "image/jpeg" : "image/webp";
    const fallbackMime = "image/jpeg";
    const dimSteps = Array.from(new Set([maxDim, Math.min(maxDim, 1000), 800]));
    const qualitySteps = [0.85, 0.76, 0.66, 0.54, 0.42];

    for (const dim of dimSteps) {
      const canvas = drawScaled(loaded.source, loaded.width, loaded.height, dim);
      for (const q of qualitySteps) {
        let blob = await canvasToBlob(canvas, preferMime, q);
        if (!blob || blob.type !== preferMime) {
          blob = await canvasToBlob(canvas, fallbackMime, q);
        }
        if (blob && blob.size <= maxBytes) {
          const ext = blob.type === "image/webp" ? "webp" : "jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
          const outFile = new File([blob], `${baseName}.${ext}`, { type: blob.type });
          return { file: outFile, originalBytes, resizedBytes: outFile.size };
        }
      }
    }
    return { file, originalBytes, resizedBytes: file.size };
  } finally {
    loaded.cleanup();
  }
}

export async function resizeSlipImageToDataUrl(file: File): Promise<{
  dataUrl: string;
  originalBytes: number;
  resizedBytes: number;
}> {
  const result = await resizeImageFileForUpload(file, {
    preset: "slip",
    maxBytes: CLIENT_MAX_IMAGE_BYTES,
  });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("อ่านไฟล์สลิปไม่สำเร็จ"));
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์สลิปไม่สำเร็จ"));
    reader.readAsDataURL(result.file);
  });
  return {
    dataUrl,
    originalBytes: result.originalBytes,
    resizedBytes: result.resizedBytes,
  };
}
