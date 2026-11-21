import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES, STAFF_ROLES } from "@/lib/auth/rbac";
import { adminUpdateOrderSchema, reviewSlipSchema } from "@/schemas/order.schema";
import { updateOrderByAdmin } from "@/services/order.service";
import { reviewOrderSlip } from "@/services/payment.service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { orderNo } = await context.params;
    const body = await req.json();
    const parsed = adminUpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (
      guard.session.role === "PACKER" &&
      !["PACKING", "SHIPPED", "DELIVERED"].includes(parsed.data.status)
    ) {
      return NextResponse.json(
        { error: "ทีมแพ็คสามารถอัปเดตได้เฉพาะสถานะแพ็คของและจัดส่ง" },
        { status: 403 }
      );
    }

    const order = await updateOrderByAdmin(orderNo, parsed.data, guard.session.userId);
    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตออเดอร์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { orderNo } = await context.params;
    const body = await req.json();
    const parsed = reviewSlipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลตรวจสลิปไม่ถูกต้อง" }, { status: 400 });
    }
    const result = await reviewOrderSlip(orderNo, parsed.data, guard.session.userId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ตรวจสอบสลิปไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
