import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, type UserRole } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginRequestSchema } from "@/schemas/auth.schema";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `ลองเข้าสู่ระบบบ่อยเกินไป กรุณารออีก ${rl.retryAfterSec} วินาที` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body: unknown = await req.json();
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.passwordHash ||
      !verifyPassword(parsed.data.password, user.passwordHash)
    ) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }
    if (!user.isActive) {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าของร้าน" },
        { status: 403 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      role: user.role as UserRole,
      name: user.name,
    });
    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    return NextResponse.json({ error: "ไม่สามารถเข้าสู่ระบบได้" }, { status: 500 });
  }
}
