import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getLineUserProfile,
  replyLineMessage,
  verifyLineSignature,
} from "@/services/adapters/line.adapter";
import { buildSteakbossQuickReply } from "@/services/adapters/line-flex";
import { handleIncomingChatMessage } from "@/services/chatbot.service";
import {
  handleIncomingLineImage,
  handleLineConfirmDeliveredPostback,
} from "@/services/line-slip.service";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { id?: string; type?: string; text?: string };
  postback?: { data?: string };
}

const DUMMY_VERIFY_TOKEN = "00000000000000000000000000000000";

async function resolveLineCustomerName(
  lineUserId: string,
  linkedName?: string | null
): Promise<string> {
  if (linkedName) return linkedName;

  const existingThread = await db.chatThread.findUnique({
    where: { channel_externalId: { channel: "LINE", externalId: lineUserId } },
    select: { customerName: true },
  });
  if (
    existingThread?.customerName &&
    !existingThread.customerName.startsWith("LINE ") &&
    existingThread.customerName !== "ลูกค้า LINE OA"
  ) {
    return existingThread.customerName;
  }

  const profile = await getLineUserProfile(lineUserId);
  if (profile?.displayName) return profile.displayName;
  return `LINE ${lineUserId.slice(-6)}`;
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "steakboss-line-webhook" });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
  }

  let parsed: { events?: LineWebhookEvent[] };
  try {
    parsed = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const replies: Array<{ userId: string; reply: string | null; mode: string }> = [];

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://steakboss.odmfood.online").replace(/\/$/, "");
  const quickReply = buildSteakbossQuickReply(baseUrl);

  for (const ev of parsed.events ?? []) {
    const lineUserId = ev.source?.userId || "unknown-line-user";
    const canReply = Boolean(ev.replyToken && ev.replyToken !== DUMMY_VERIFY_TOKEN);

    if (ev.type === "follow") {
      const welcome =
        "สวัสดีครับ ยินดีต้อนรับสู่ STEAKBOSS-MAM ตัวแทนจัดจำหน่ายและจัดส่ง ย่านรามอินทรา ภายใต้ Brand SteakBoss 🥩\nเลือกเมนูหรือบริการที่ต้องการจากปุ่มด้านล่างได้เลยครับ 👇";
      if (canReply) {
        await replyLineMessage(ev.replyToken!, [{ type: "text", text: welcome, quickReply }]);
      }
      replies.push({ userId: lineUserId, reply: welcome, mode: "FOLLOW" });
      continue;
    }

    if (ev.type === "postback" && ev.postback?.data) {
      const qs = new URLSearchParams(ev.postback.data);
      if (qs.get("action") === "confirm_delivered" && qs.get("orderNo")) {
        const res = await handleLineConfirmDeliveredPostback(lineUserId, qs.get("orderNo")!);
        if (canReply) {
          await replyLineMessage(ev.replyToken!, [{ type: "text", text: res.reply, quickReply }]);
        }
        replies.push({ userId: lineUserId, reply: res.reply, mode: "POSTBACK" });
      }
      continue;
    }

    if (ev.type !== "message") continue;

    const linkedUser = await db.user.findUnique({
      where: { lineUserId },
      select: { id: true, name: true },
    });
    const customerName = await resolveLineCustomerName(lineUserId, linkedUser?.name);

    if (ev.message?.type === "image" && ev.message.id) {
      const res = await handleIncomingLineImage({
        lineUserId,
        customerName,
        userId: linkedUser?.id,
        messageId: ev.message.id,
      });
      if (canReply && res.reply) {
        await replyLineMessage(ev.replyToken!, [{ type: "text", text: res.reply, quickReply }]);
      }
      replies.push({ userId: lineUserId, reply: res.reply, mode: "SLIP_IMAGE" });
      continue;
    }

    if (ev.message?.type === "text" && ev.message.text) {
      const result = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineUserId,
        customerName,
        userId: linkedUser?.id,
        content: ev.message.text,
      });
      if (canReply && (result.flexMessages?.length || result.reply)) {
        const payload = result.flexMessages?.length
          ? result.flexMessages
          : [{ type: "text" as const, text: result.reply!, quickReply }];
        await replyLineMessage(ev.replyToken!, payload);
      }
      replies.push({ userId: lineUserId, reply: result.reply, mode: result.mode });
    }
  }

  return NextResponse.json({ ok: true, processed: replies.length, replies });
}
