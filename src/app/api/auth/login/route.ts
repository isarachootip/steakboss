import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, type UserRole } from "@/lib/auth/session";
import { loginRequestSchema } from "@/schemas/auth.schema";
import { normalizePhone } from "@/domain/order";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (parsed.data.mode === "staff") {
      const user = await db.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
      });
      if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return NextResponse.json(
          { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
          { status: 401 }
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
    }

    const phone = normalizePhone(parsed.data.phone);
    if (phone.length < 9) {
      return NextResponse.json({ error: "เบอร์โทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
    }

    let customer = await db.user.findUnique({ where: { phone } });
    if (!customer) {
      customer = await db.user.create({
        data: {
          role: "CUSTOMER",
          phone,
          name: parsed.data.name || `ลูกค้า ${phone.slice(-4)}`,
          email: parsed.data.email || null,
          lineUserId: parsed.data.lineUserId || null,
        },
      });
    } else if (parsed.data.name || parsed.data.lineUserId) {
      customer = await db.user.update({
        where: { id: customer.id },
        data: {
          name: parsed.data.name || customer.name,
          lineUserId: parsed.data.lineUserId || customer.lineUserId,
        },
      });
    }

    await setSessionCookie({
      userId: customer.id,
      role: customer.role as UserRole,
      name: customer.name,
    });
    return NextResponse.json({
      user: {
        id: customer.id,
        name: customer.name,
        role: customer.role,
        phone: customer.phone,
        lineUserId: customer.lineUserId,
      },
    });
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    return NextResponse.json({ error: "ไม่สามารถเข้าสู่ระบบได้" }, { status: 500 });
  }
}
