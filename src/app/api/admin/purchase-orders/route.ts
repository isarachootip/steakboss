import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { createPurchaseOrderSchema } from "@/schemas/purchase-order.schema";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  PurchaseOrderConflictError,
} from "@/services/purchase-order.service";

export async function GET(req: Request) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const includeCost = guard.session.role !== "PACKER";

  const purchaseOrders = await listPurchaseOrders({
    includeCost,
    status,
    search,
  });
  return NextResponse.json({ purchaseOrders });
}

export async function POST(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();
    const parsed = createPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลใบสั่งซื้อไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const purchaseOrder = await createPurchaseOrder(
      parsed.data,
      guard.session.userId
    );
    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (err) {
    if (err instanceof PurchaseOrderConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "สร้างใบสั่งซื้อไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
