import { NextResponse } from "next/server";
import { OWNER_ROLES, requireRole } from "@/lib/auth/rbac";
import { updateStaffSchema } from "@/schemas/staff.schema";
import {
  deleteStaffMember,
  updateStaffMember,
} from "@/services/staff.service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(OWNER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลที่แก้ไขไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const member = await updateStaffMember(guard.session.userId, id, parsed.data);
    return NextResponse.json({ member });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตสิทธิ์พนักงานไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(OWNER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    await deleteStaffMember(guard.session.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ลบบัญชีพนักงานไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
