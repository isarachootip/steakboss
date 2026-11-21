import crypto from "node:crypto";

export interface LineFlexBubble {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}

export interface LineTextMessage {
  type: "text";
  text: string;
}

export type LineMessagePayload = LineTextMessage | LineFlexBubble;

export interface LineSendResult {
  mode: "live" | "sandbox";
  ok: boolean;
  error?: string;
}

export function verifyLineSignature(
  rawBody: string,
  signatureHeader: string | null,
  channelSecret: string = process.env.LINE_CHANNEL_SECRET || ""
): boolean {
  if (!channelSecret) {
    // Allow sandbox webhook testing when channel secret is not configured
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

async function callLineApi(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<LineSendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) {
    return { mode: "sandbox", ok: true };
  }
  try {
    const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
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
  messages: LineMessagePayload[]
): Promise<LineSendResult> {
  return callLineApi("reply", { replyToken, messages });
}

export async function pushLineMessage(
  to: string,
  messages: LineMessagePayload[]
): Promise<LineSendResult> {
  return callLineApi("push", { to, messages });
}

export function buildOrderFlexMessage(params: {
  orderNo: string;
  statusLabel: string;
  totalBaht: number;
  detailLine: string;
  trackUrl: string;
}): LineFlexBubble {
  return {
    type: "flex",
    altText: `Steakboss ${params.orderNo}: ${params.statusLabel}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#151211",
        contents: [
          {
            type: "text",
            text: "STEAKBOSS",
            color: "#ff6fb7",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: params.statusLabel,
            color: "#f7f0ea",
            weight: "bold",
            size: "lg",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: `เลขคำสั่งซื้อ: ${params.orderNo}`, weight: "bold" },
          { type: "text", text: `ยอดรวม: ฿${params.totalBaht.toLocaleString("th-TH")}` },
          { type: "text", text: params.detailLine, wrap: true, size: "sm", color: "#555555" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#ff6fb7",
            action: {
              type: "uri",
              label: "ติดตามคำสั่งซื้อ",
              uri: params.trackUrl,
            },
          },
        ],
      },
    },
  };
}
