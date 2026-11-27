import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { reorderHeroSlidesSchema } from "@/schemas/promo.schema";
import { reorderHeroSlides } from "@/services/promo.service";

export async function PATCH(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = reorderHeroSlidesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ลำดับสไลด์ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const slides = await reorderHeroSlides(parsed.data.orderedIds);
    return NextResponse.json({ slides });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เรียงลำดับสไลด์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
