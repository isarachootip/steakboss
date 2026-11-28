import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie, type UserRole } from "@/lib/auth/session";
import {
  upsertCustomerFromLineProfile,
  verifyLineLiffIdToken,
} from "@/services/line-login.service";

const liffAuthSchema = z.object({
  idToken: z.string().trim().min(10, "ไม่พบ LIFF ID Token"),
});

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = liffAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูล LIFF ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const profile = await verifyLineLiffIdToken(parsed.data.idToken);
    const user = await upsertCustomerFromLineProfile(profile);
    await setSessionCookie({
      userId: user.id,
      role: user.role as UserRole,
      name: user.name,
    });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ยืนยันตัวตน LIFF ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
