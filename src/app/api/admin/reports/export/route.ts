import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";
import { exportOrdersCsv } from "@/services/report.service";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const csv = await exportOrdersCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="steakboss-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
