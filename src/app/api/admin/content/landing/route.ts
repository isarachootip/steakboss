import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { landingContentSchema } from "@/schemas/content.schema";
import {
  getLandingContent,
  resetLandingContent,
  updateLandingContent,
} from "@/services/content.service";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const landing = await getLandingContent();
  return NextResponse.json({ landing });
}

export async function PATCH(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = landingContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลหน้าแรกไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const landing = await updateLandingContent(parsed.data);
    return NextResponse.json({ landing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const landing = await resetLandingContent();
  return NextResponse.json({ landing });
}
