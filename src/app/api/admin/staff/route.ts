import { NextResponse } from "next/server";
import { OWNER_ROLES, requireRole } from "@/lib/auth/rbac";
import { createStaffSchema } from "@/schemas/staff.schema";
import { createStaffMember, listStaffMembers } from "@/services/staff.service";

export async function GET() {
  const guard = await requireRole(OWNER_ROLES);
  if (!guard.ok) return guard.response;

  const staff = await listStaffMembers();
  return NextResponse.json({ staff });
}

export async function POST(req: Request) {
  const guard = await requireRole(OWNER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลพนักงานไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const member = await createStaffMember(parsed.data);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เพิ่มพนักงานไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
