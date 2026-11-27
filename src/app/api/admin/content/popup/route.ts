import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { updateEventPopupSchema } from "@/schemas/promo.schema";
import {
  getEventPopup,
  resetEventPopup,
  updateEventPopup,
} from "@/services/promo.service";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const popup = await getEventPopup();
  return NextResponse.json({ popup });
}

export async function PATCH(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = updateEventPopupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลป๊อปอัปไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const popup = await updateEventPopup(parsed.data);
    return NextResponse.json({ popup });
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกป๊อปอัปไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const popup = await resetEventPopup();
  return NextResponse.json({ popup });
}
