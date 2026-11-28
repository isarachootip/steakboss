import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateCustomerProfileSchema } from "@/schemas/profile.schema";
import { updateCustomerProfile } from "@/services/line-login.service";

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });
  }

  try {
    const body: unknown = await req.json();
    const parsed = updateCustomerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลโปรไฟล์ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const result = await updateCustomerProfile(session.userId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
