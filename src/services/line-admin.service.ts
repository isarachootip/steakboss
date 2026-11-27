import { db } from "@/lib/db";
import type { LineBotInfo } from "@/schemas/line.schema";
import {
  getLineBotInfo,
  pushLineMessage,
  type LineClientOptions,
  type LineSendResult,
} from "./adapters/line.adapter";

export interface AdminLineStatus {
  isLive: boolean;
  hasChannelId: boolean;
  hasChannelSecret: boolean;
  hasAccessToken: boolean;
  hasStaffTarget: boolean;
  channelIdPreview: string | null;
  staffTargetPreview: string | null;
  webhookPath: string;
  bot: LineBotInfo | null;
  botError: string | null;
}

export function maskIdentifier(raw: string): string | null {
  const clean = raw.trim();
  if (!clean) return null;
  if (clean.length <= 10) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function resolvePublicLineId(bot: LineBotInfo): string | null {
  if (bot.premiumId?.trim()) {
    const p = bot.premiumId.trim();
    return p.startsWith("@") ? p : `@${p}`;
  }
  if (bot.basicId?.trim()) {
    const b = bot.basicId.trim();
    return b.startsWith("@") ? b : `@${b}`;
  }
  return null;
}

export async function getAdminLineStatus(overrides?: {
  token?: string;
  channelId?: string;
  channelSecret?: string;
  staffTargetId?: string;
  fetchFn?: typeof fetch;
}): Promise<AdminLineStatus> {
  const channelId = (overrides?.channelId ?? process.env.LINE_CHANNEL_ID ?? "").trim();
  const channelSecret = (
    overrides?.channelSecret ??
    process.env.LINE_CHANNEL_SECRET ??
    ""
  ).trim();
  const token = (
    overrides?.token ??
    process.env.LINE_CHANNEL_ACCESS_TOKEN ??
    ""
  ).trim();
  const staffTarget = (
    overrides?.staffTargetId ??
    process.env.LINE_STAFF_GROUP_ID ??
    ""
  ).trim();

  let bot: LineBotInfo | null = null;
  let botError: string | null = null;

  if (token) {
    const info = await getLineBotInfo({
      token,
      fetchFn: overrides?.fetchFn,
    });
    if (info.ok && info.bot) {
      bot = info.bot;
    } else if (!info.ok) {
      botError = info.error ?? "ดึงข้อมูลบอทไม่สำเร็จ";
    }
  }

  return {
    isLive: Boolean(channelSecret && token),
    hasChannelId: Boolean(channelId),
    hasChannelSecret: Boolean(channelSecret),
    hasAccessToken: Boolean(token),
    hasStaffTarget: Boolean(staffTarget),
    channelIdPreview: channelId || null,
    staffTargetPreview: maskIdentifier(staffTarget),
    webhookPath: "/api/webhooks/line",
    bot,
    botError,
  };
}

export async function sendAdminLineTestPush(
  overrides?: LineClientOptions & { to?: string }
): Promise<LineSendResult> {
  const target = (overrides?.to ?? process.env.LINE_STAFF_GROUP_ID ?? "").trim();
  if (!target) {
    return {
      mode: "sandbox",
      ok: false,
      error: "ยังไม่ได้ตั้งค่า LINE_STAFF_GROUP_ID สำหรับรับแจ้งเตือนแอดมิน",
    };
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return pushLineMessage(
    target,
    [
      {
        type: "text",
        text: `✅ [Steakboss] ทดสอบเชื่อมต่อระบบแจ้งเตือน LINE OA สำเร็จ!\nพร้อมแจ้งเตือนออเดอร์ใหม่ สลิปโอนเงิน และลูกค้าเรียกแอดมิน\nหลังบ้าน: ${baseUrl}/admin`,
      },
    ],
    overrides
  );
}

export async function syncStoreLineFromBot(overrides?: LineClientOptions) {
  const info = await getLineBotInfo(overrides);
  if (!info.ok || !info.bot) {
    return {
      ok: false,
      error: info.error ?? "ไม่พบ Channel Access Token สำหรับดึงข้อมูล LINE OA",
    };
  }

  const resolvedId = resolvePublicLineId(info.bot);
  if (!resolvedId) {
    return { ok: false, error: "ไม่พบ LINE Basic ID จากบัญชีบอทนี้" };
  }

  const lineOaUrl = `https://line.me/R/ti/p/${resolvedId}`;
  const settings = await db.storeSetting.upsert({
    where: { id: "default" },
    update: { lineId: resolvedId, lineOaUrl },
    create: { id: "default", lineId: resolvedId, lineOaUrl },
  });

  return { ok: true, settings, bot: info.bot };
}
