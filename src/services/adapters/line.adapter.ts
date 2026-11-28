import crypto from "node:crypto";
import {
  lineBotInfoSchema,
  lineUserProfileSchema,
  type LineBotInfo,
  type LineUserProfile,
} from "@/schemas/line.schema";
import {
  buildOrderFlexMessage,
  buildPromptPayOrderFlexMessage,
  type LineFlexBubble,
  type LineMessagePayload,
  type LineTextMessage,
} from "./line-flex";

export {
  buildOrderFlexMessage,
  buildPromptPayOrderFlexMessage,
  type LineFlexBubble,
  type LineMessagePayload,
  type LineTextMessage,
};

export interface LineSendResult {
  mode: "live" | "sandbox";
  ok: boolean;
  error?: string;
}

export interface LineClientOptions {
  token?: string;
  fetchFn?: typeof fetch;
}

export function verifyLineSignature(
  rawBody: string,
  signatureHeader: string | null,
  channelSecret: string = process.env.LINE_CHANNEL_SECRET || ""
): boolean {
  if (!channelSecret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function resolveEffectiveToken(options?: LineClientOptions): string {
  if (process.env.NODE_ENV === "test" && !options?.fetchFn) {
    return "";
  }
  return (options?.token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "").trim();
}

async function callLineMessageApi(
  endpoint: "reply" | "push",
  payload: Record<string, unknown>,
  options?: LineClientOptions
): Promise<LineSendResult> {
  const token = resolveEffectiveToken(options);
  if (!token) {
    return { mode: "sandbox", ok: true };
  }
  const fetchImpl = options?.fetchFn ?? fetch;
  try {
    const res = await fetchImpl(`https://api.line.me/v2/bot/message/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { mode: "live", ok: false, error: `LINE API HTTP ${res.status}` };
    }
    return { mode: "live", ok: true };
  } catch (err) {
    return {
      mode: "live",
      ok: false,
      error: err instanceof Error ? err.message : "LINE network error",
    };
  }
}

export async function replyLineMessage(
  replyToken: string,
  messages: LineMessagePayload[],
  options?: LineClientOptions
): Promise<LineSendResult> {
  return callLineMessageApi("reply", { replyToken, messages }, options);
}

export async function pushLineMessage(
  to: string,
  messages: LineMessagePayload[],
  options?: LineClientOptions
): Promise<LineSendResult> {
  return callLineMessageApi("push", { to, messages }, options);
}

export async function getLineBotInfo(options?: LineClientOptions): Promise<{
  ok: boolean;
  mode: "live" | "sandbox";
  bot?: LineBotInfo;
  error?: string;
}> {
  const token = resolveEffectiveToken(options);
  if (!token) {
    return { ok: true, mode: "sandbox" };
  }
  const fetchImpl = options?.fetchFn ?? fetch;
  try {
    const res = await fetchImpl("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, mode: "live", error: `LINE API HTTP ${res.status}` };
    }
    const parsed = lineBotInfoSchema.safeParse(await res.json());
    if (!parsed.success) {
      return { ok: false, mode: "live", error: "ข้อมูลโปรไฟล์บอทจาก LINE ไม่ถูกต้อง" };
    }
    return { ok: true, mode: "live", bot: parsed.data };
  } catch (err) {
    return {
      ok: false,
      mode: "live",
      error: err instanceof Error ? err.message : "เชื่อมต่อ LINE API ไม่สำเร็จ",
    };
  }
}

export async function getLineUserProfile(
  userId: string,
  options?: LineClientOptions
): Promise<LineUserProfile | null> {
  const token = resolveEffectiveToken(options);
  if (!token || !userId || userId === "unknown-line-user") {
    return null;
  }
  const fetchImpl = options?.fetchFn ?? fetch;
  try {
    const res = await fetchImpl(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const parsed = lineUserProfileSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function downloadLineMessageContent(
  messageId: string,
  options?: LineClientOptions
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const token = resolveEffectiveToken(options);
  if (!token || !messageId) {
    return null;
  }
  const fetchImpl = options?.fetchFn ?? fetch;
  try {
    const res = await fetchImpl(
      `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return { buffer: Buffer.from(arrayBuffer), contentType };
  } catch {
    return null;
  }
}
