import { NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { createGoodsReceiptSchema } from "@/schemas/purchase-order.schema";
import { receivePurchaseOrder } from "@/services/goods-receipt.service";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = createGoodsReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลใบรับสินค้าไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const includeCost = guard.session.role !== "PACKER";
    const purchaseOrder = await receivePurchaseOrder({
      purchaseOrderId: id,
      input: parsed.data,
      actorId: guard.session.userId,
      includeCost,
    });
    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกรับสินค้าไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
