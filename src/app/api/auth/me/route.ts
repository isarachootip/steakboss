import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { isLineLoginConfigured } from "@/services/line-login.service";

export async function GET() {
  const lineLoginEnabled = isLineLoginConfigured();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, lineLoginEnabled });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      email: true,
      lineUserId: true,
      linePictureUrl: true,
      addresses: {
        orderBy: { isDefault: "desc" },
      },
    },
  });

  return NextResponse.json({ user, lineLoginEnabled });
}
