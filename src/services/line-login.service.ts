import { db } from "@/lib/db";
import { normalizePhone } from "@/domain/order";
import type { UpdateCustomerProfileInput } from "@/schemas/profile.schema";
import { saveDefaultCustomerAddressInTx } from "./customer-address.service";

export { verifyLineLiffIdToken } from "./line-liff-auth.service";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export function isLineLoginConfigured(): boolean {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID?.trim() &&
      process.env.LINE_LOGIN_CHANNEL_SECRET?.trim()
  );
}

export function sanitizeNextPath(raw?: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

export function resolveLineRedirectUri(reqUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = configured ? configured.replace(/\/$/, "") : new URL(reqUrl).origin;
  return `${base}/api/auth/line/callback`;
}

export function buildLineAuthorizeUrl(params: {
  state: string;
  redirectUri: string;
}): string {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", "profile openid");
  url.searchParams.set("bot_prompt", "normal");
  return url.toString();
}

export async function exchangeLineCodeForProfile(params: {
  code: string;
  redirectUri: string;
}): Promise<LineProfile> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET?.trim();
  if (!channelId || !channelSecret) {
    throw new Error("ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID และ LINE_LOGIN_CHANNEL_SECRET");
  }

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || "ไม่สามารถยืนยันตัวตนกับ LINE ได้");
  }

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profileJson = (await profileRes.json().catch(() => ({}))) as {
    userId?: string;
    displayName?: string;
    pictureUrl?: string;
  };
  if (!profileRes.ok || !profileJson.userId) {
    throw new Error("ไม่สามารถดึงโปรไฟล์ผู้ใช้จาก LINE ได้");
  }

  return {
    userId: profileJson.userId,
    displayName: profileJson.displayName?.trim() || "ลูกค้า LINE",
    pictureUrl: profileJson.pictureUrl,
  };
}

export async function upsertCustomerFromLineProfile(profile: LineProfile) {
  const existing = await db.user.findUnique({ where: { lineUserId: profile.userId } });
  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name || profile.displayName,
        linePictureUrl: profile.pictureUrl ?? existing.linePictureUrl,
      },
    });
  }
  return db.user.create({
    data: {
      role: "CUSTOMER",
      lineUserId: profile.userId,
      name: profile.displayName,
      linePictureUrl: profile.pictureUrl ?? null,
    },
  });
}

export async function updateCustomerProfile(
  userId: string,
  input: UpdateCustomerProfileInput
) {
  const cleanPhone = input.phone ? normalizePhone(input.phone) : "";
  const cleanEmail = input.email?.trim() || null;

  return db.$transaction(async (tx) => {
    if (cleanPhone) {
      const phoneOwner = await tx.user.findUnique({
        where: { phone: cleanPhone },
        select: { id: true },
      });
      if (phoneOwner && phoneOwner.id !== userId) {
        throw new Error("เบอร์โทรศัพท์นี้ถูกผูกไว้กับบัญชีอื่นแล้ว กรุณาติดต่อแอดมิน");
      }
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(cleanEmail !== null ? { email: cleanEmail } : {}),
      },
      select: { phone: true },
    });

    await saveDefaultCustomerAddressInTx(tx, {
      userId,
      recipientName: input.name,
      phone: cleanPhone || user.phone || "",
      addressLine: input.addressLine,
      postalCode: input.postalCode,
    });

    let linkedOrdersCount = 0;
    if (cleanPhone) {
      const linked = await tx.order.updateMany({
        where: { customerPhone: cleanPhone, userId: null },
        data: { userId },
      });
      linkedOrdersCount = linked.count;
    }

    const refreshed = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        lineUserId: true,
        linePictureUrl: true,
        addresses: { orderBy: { isDefault: "desc" } },
      },
    });
    return { user: refreshed, linkedOrdersCount };
  });
}
