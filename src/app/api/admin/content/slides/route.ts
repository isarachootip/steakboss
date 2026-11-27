import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { upsertHeroSlideSchema } from "@/schemas/promo.schema";
import {
  createHeroSlide,
  listAllHeroSlidesAdmin,
} from "@/services/promo.service";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const slides = await listAllHeroSlidesAdmin();
  return NextResponse.json({ slides });
}

export async function POST(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = upsertHeroSlideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลสไลด์ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const slide = await createHeroSlide(parsed.data);
    return NextResponse.json({ slide }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "สร้างสไลด์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
