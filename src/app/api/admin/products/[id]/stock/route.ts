import { NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { adjustProductStock } from "@/services/product.service";
import { adjustStockSchema } from "@/schemas/product.schema";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลสต็อกไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const product = await adjustProductStock({
      productId: id,
      deltaQty: parsed.data.deltaQty,
      type: parsed.data.type,
      reason: parsed.data.reason,
      actorId: guard.session.userId,
    });
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ปรับสต็อกไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
