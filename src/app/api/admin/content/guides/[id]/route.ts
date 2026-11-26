import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { patchCookingGuideSchema } from "@/schemas/content.schema";
import {
  deleteCookingGuide,
  updateCookingGuide,
} from "@/services/content.service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = patchCookingGuideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลที่แก้ไขไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const guide = await updateCookingGuide(id, parsed.data);
    return NextResponse.json({ guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตคู่มือไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    await deleteCookingGuide(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ลบคู่มือไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
