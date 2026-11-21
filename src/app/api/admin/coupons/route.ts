import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";
import { createCoupon, listCoupons, setCouponActive } from "@/services/settings.service";
import { createCouponSchema, toggleCouponSchema } from "@/schemas/product.schema";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;
  const coupons = await listCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const guard = await requireRole(["OWNER"]);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลคูปองไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const coupon = await createCoupon(parsed.data);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "สร้างคูปองไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const guard = await requireRole(["OWNER"]);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const parsed = toggleCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const coupon = await setCouponActive(parsed.data.id, parsed.data.isActive);
  return NextResponse.json({ coupon });
}
