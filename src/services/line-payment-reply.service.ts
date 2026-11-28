import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";
import { formatBaht } from "@/lib/format";
import { getStoreSettings } from "./settings.service";
import {
  buildPromptPayOrderFlexMessage,
  buildSteakbossQuickReply,
  type LineMessagePayload,
} from "./adapters/line-flex";

const DEFAULT_PUBLIC_HTTPS_URL = "https://steakboss.odmfood.online";

export function resolvePublicHttpsBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured && configured.startsWith("https://")) {
    return configured;
  }
  return DEFAULT_PUBLIC_HTTPS_URL;
}

export async function buildPromptPayFlexForOrder(params: {
  orderNo: string;
  totalBaht: number;
  includeQuickReply?: boolean;
}): Promise<LineMessagePayload> {
  const settings = await getStoreSettings();
  const baseUrl = resolvePublicHttpsBaseUrl();
  const encodedNo = encodeURIComponent(params.orderNo);

  return buildPromptPayOrderFlexMessage({
    orderNo: params.orderNo,
    totalBaht: params.totalBaht,
    promptpayId: settings.promptpayId,
    promptpayName: settings.promptpayName,
    qrImageUrl: `${baseUrl}/api/store/qr/${encodedNo}.png`,
    payUrl: `${baseUrl}/orders/${encodedNo}/pay`,
    trackUrl: `${baseUrl}/track?orderNo=${encodedNo}`,
    quickReply: params.includeQuickReply ? buildSteakbossQuickReply(baseUrl) : undefined,
  });
}

export async function buildLinePendingPaymentReply(params: {
  userId?: string;
  lineUserId?: string;
}): Promise<{ text: string; flexMessages?: LineMessagePayload[] } | null> {
  if (!params.userId && !params.lineUserId) return null;

  const now = new Date();
  const ownerFilters = [
    ...(params.userId ? [{ userId: params.userId }] : []),
    ...(params.lineUserId ? [{ user: { lineUserId: params.lineUserId } }] : []),
  ];

  const order = await db.order.findFirst({
    where: {
      paymentMethod: "PROMPTPAY",
      status: { in: ["PENDING_PAYMENT", "SLIP_SUBMITTED"] },
      AND: [
        { OR: ownerFilters },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { orderNo: true, status: true, totalBaht: true },
  });
  if (!order) return null;

  const baseUrl = resolvePublicHttpsBaseUrl();
  const quickReply = buildSteakbossQuickReply(baseUrl);

  if (order.status === "SLIP_SUBMITTED") {
    const text = `ออเดอร์ ${order.orderNo} (ยอด ${formatBaht(order.totalBaht)}) ได้รับสลิปแล้วครับ\nสถานะ: รอตรวจสอบสลิป (ยังไม่ยืนยันออเดอร์) เมื่อตรวจสลิปผ่านระบบจะยืนยันและตัดสต็อกให้ทันทีครับ`;
    return { text, flexMessages: [{ type: "text", text, quickReply }] };
  }

  const qrFlex = await buildPromptPayFlexForOrder({
    orderNo: order.orderNo,
    totalBaht: order.totalBaht,
    includeQuickReply: true,
  });
  const text = `ออเดอร์ ${order.orderNo} ยอด ${formatBaht(order.totalBaht)} (สถานะ: รอชำระเงิน — ยังไม่ยืนยันออเดอร์)\nกรุณาสแกน QR พร้อมเพย์ด้านบนแล้วส่งรูปสลิปเข้ามาในแชทนี้เพื่อตรวจสอบและยืนยันออเดอร์ครับ`;
  return { text, flexMessages: [qrFlex] };
}

export async function buildLatestOrderStatusReply(params: {
  userId: string;
  channel: "WEB" | "LINE";
}): Promise<{ text: string; flexMessages?: LineMessagePayload[] } | null> {
  const latest = await db.order.findFirst({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    select: {
      orderNo: true,
      status: true,
      paymentMethod: true,
      totalBaht: true,
      carrier: true,
      trackingNo: true,
    },
  });
  if (!latest) return null;

  const label = isOrderStatus(latest.status) ? ORDER_STATUS_LABELS[latest.status] : latest.status;
  const trackLine = latest.trackingNo
    ? `\nขนส่ง: ${latest.carrier || "รถเย็น"} เลขพัสดุ ${latest.trackingNo}`
    : "";
  const baseUrl = resolvePublicHttpsBaseUrl();
  const summary = `ออเดอร์ล่าสุดของคุณ ${latest.orderNo}\nสถานะ: ${label}${trackLine}\nยอดรวม ${formatBaht(latest.totalBaht)}\nดูรายละเอียด: ${baseUrl}/track?orderNo=${latest.orderNo}`;

  if (
    params.channel === "LINE" &&
    latest.status === "PENDING_PAYMENT" &&
    latest.paymentMethod === "PROMPTPAY"
  ) {
    const qrFlex = await buildPromptPayFlexForOrder({
      orderNo: latest.orderNo,
      totalBaht: latest.totalBaht,
      includeQuickReply: true,
    });
    return { text: summary, flexMessages: [qrFlex] };
  }
  return { text: summary };
}
