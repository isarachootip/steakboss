import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { upsertCookingGuideSchema } from "@/schemas/content.schema";
import {
  createCookingGuide,
  listAllGuidesAdmin,
} from "@/services/content.service";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const guides = await listAllGuidesAdmin();
  return NextResponse.json({ guides });
}

export async function POST(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = upsertCookingGuideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลคู่มือไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const guide = await createCookingGuide(parsed.data);
    return NextResponse.json({ guide }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "สร้างคู่มือไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
