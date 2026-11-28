import QRCode from "qrcode";
import { db } from "@/lib/db";
import { buildPromptPayPayload } from "@/domain/promptpay";
import { getStoreSettings } from "@/services/settings.service";

interface CachedQr {
  bytes: Uint8Array;
  expiresAt: number;
}

const qrCache = new Map<string, CachedQr>();
const MAX_CACHE = 400;
const TTL_MS = 60 * 60 * 1000;

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  const { orderNo: rawParam } = await context.params;
  const orderNo = rawParam.replace(/\.png$/i, "").trim().toUpperCase();
  if (!orderNo) {
    return new Response("Missing orderNo", { status: 400 });
  }

  const now = Date.now();
  const cached = qrCache.get(orderNo);
  if (cached && now < cached.expiresAt) {
    return new Response(Buffer.from(cached.bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(cached.bytes.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { orderNo },
      select: { totalBaht: true, paymentMethod: true },
    }),
    getStoreSettings(),
  ]);
  if (!order || !settings.promptpayId) {
    return new Response("QR not available", { status: 404 });
  }

  const payload = buildPromptPayPayload(settings.promptpayId, order.totalBaht);
  const pngBuffer = await QRCode.toBuffer(payload, {
    type: "png",
    width: 420,
    margin: 2,
  });
  const bytes = new Uint8Array(pngBuffer);

  if (qrCache.size >= MAX_CACHE) {
    const oldest = qrCache.keys().next().value;
    if (oldest) qrCache.delete(oldest);
  }
  qrCache.set(orderNo, { bytes, expiresAt: now + TTL_MS });

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
