import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";
import { sendAdminChatReply } from "@/services/chatbot.service";

const replySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

const modeSchema = z.object({
  mode: z.enum(["BOT", "HUMAN"]),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const { threadId } = await context.params;
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 100 },
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          orders: {
            select: {
              orderNo: true,
              status: true,
              totalBaht: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "ไม่พบห้องแชท" }, { status: 404 });
  }
  return NextResponse.json({ thread });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const { threadId } = await context.params;
  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  }

  try {
    const message = await sendAdminChatReply(
      threadId,
      parsed.data.content,
      guard.session.userId
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ส่งข้อความไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const { threadId } = await context.params;
  const body = await req.json();
  const parsed = modeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "โหมดไม่ถูกต้อง" }, { status: 400 });
  }

  const thread = await db.chatThread.update({
    where: { id: threadId },
    data: { mode: parsed.data.mode },
  });
  return NextResponse.json({ thread });
}
