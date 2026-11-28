import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { patchPurchaseOrderSchema } from "@/schemas/purchase-order.schema";
import {
  cancelPurchaseOrder,
  getPurchaseOrderById,
  shortClosePurchaseOrder,
  updatePurchaseOrder,
} from "@/services/purchase-order.service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const includeCost = guard.session.role !== "PACKER";
  const purchaseOrder = await getPurchaseOrderById(id, includeCost);
  if (!purchaseOrder) {
    return NextResponse.json({ error: "ไม่พบใบสั่งซื้อนี้" }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = patchPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลอัปเดตใบสั่งซื้อไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const purchaseOrder =
      data.action === "UPDATE"
        ? await updatePurchaseOrder(id, {
            supplierName: data.supplierName,
            expectedDate: data.expectedDate,
            note: data.note,
            items: data.items,
          })
        : data.action === "SHORT_CLOSE"
          ? await shortClosePurchaseOrder(id, data.reason)
          : await cancelPurchaseOrder(id, data.reason);

    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตใบสั่งซื้อไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
