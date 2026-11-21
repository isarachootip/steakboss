import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const threads = await db.chatThread.findMany({
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      user: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      channel: t.channel,
      externalId: t.externalId,
      customerName: t.customerName,
      mode: t.mode,
      lastMessageAt: t.lastMessageAt,
      lastMessage: t.messages[0]?.content ?? "",
      userPhone: t.user?.phone ?? null,
    })),
  });
}
