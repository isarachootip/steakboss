import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { replyLineMessage, verifyLineSignature } from "@/services/adapters/line.adapter";
import { handleIncomingChatMessage } from "@/services/chatbot.service";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type?: string; text?: string };
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

  for (const ev of parsed.events ?? []) {
    if (ev.type !== "message" || ev.message?.type !== "text" || !ev.message.text) {
      continue;
    }
    const lineUserId = ev.source?.userId || "unknown-line-user";
    const linkedUser = await db.user.findUnique({
      where: { lineUserId },
      select: { id: true, name: true },
    });

    const result = await handleIncomingChatMessage({
      channel: "LINE",
      externalId: lineUserId,
      customerName: linkedUser?.name ?? `LINE ${lineUserId.slice(-6)}`,
      userId: linkedUser?.id,
      content: ev.message.text,
    });

    if (result.reply && ev.replyToken) {
      await replyLineMessage(ev.replyToken, [{ type: "text", text: result.reply }]);
    }
    replies.push({ userId: lineUserId, reply: result.reply, mode: result.mode });
  }

  return NextResponse.json({ ok: true, processed: replies.length, replies });
}
