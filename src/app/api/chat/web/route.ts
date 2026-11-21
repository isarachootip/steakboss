import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { handleIncomingChatMessage } from "@/services/chatbot.service";

const webChatSchema = z.object({
  sessionId: z.string().trim().min(4).max(80),
  message: z.string().trim().min(1).max(1000),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ messages: [], mode: "BOT" });
  }
  const thread = await db.chatThread.findUnique({
    where: { channel_externalId: { channel: "WEB", externalId: sessionId } },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  return NextResponse.json({
    mode: thread?.mode ?? "BOT",
    messages: thread?.messages ?? [],
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = webChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อความไม่ถูกต้อง" }, { status: 400 });
  }
  const session = await getSession();
  const result = await handleIncomingChatMessage({
    channel: "WEB",
    externalId: parsed.data.sessionId,
    customerName: session?.name,
    userId: session?.role === "CUSTOMER" ? session.userId : undefined,
    content: parsed.data.message,
  });
  return NextResponse.json(result);
}
