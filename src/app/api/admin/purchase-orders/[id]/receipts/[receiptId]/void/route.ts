import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { voidGoodsReceiptSchema } from "@/schemas/purchase-order.schema";
import { voidGoodsReceipt } from "@/services/goods-receipt.service";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; receiptId: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id, receiptId } = await context.params;
    const body: unknown = await req.json();
    const parsed = voidGoodsReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "กรุณาระบุเหตุผลการยกเลิกใบรับ" },
        { status: 400 }
      );
    }

    const purchaseOrder = await voidGoodsReceipt({
      purchaseOrderId: id,
      receiptId,
      reason: parsed.data.reason,
      actorId: guard.session.userId,
      includeCost: true,
    });
    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ยกเลิกใบรับสินค้าไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
