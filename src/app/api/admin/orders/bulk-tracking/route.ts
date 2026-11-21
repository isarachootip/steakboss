import { NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { bulkTrackingSchema } from "@/schemas/order.schema";
import { updateOrderByAdmin } from "@/services/order.service";

export async function POST(req: Request) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const parsed = bulkTrackingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูล CSV เลขพัสดุไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const results: Array<{ orderNo: string; ok: boolean; error?: string }> = [];
  for (const row of parsed.data.rows) {
    try {
      await updateOrderByAdmin(
        row.orderNo.toUpperCase(),
        {
          status: "SHIPPED",
          carrier: row.carrier,
          trackingNo: row.trackingNo,
        },
        guard.session.userId
      );
      results.push({ orderNo: row.orderNo, ok: true });
    } catch (err) {
      results.push({
        orderNo: row.orderNo,
        ok: false,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  return NextResponse.json({
    updated: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
