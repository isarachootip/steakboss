import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, STAFF_ROLES } from "@/lib/auth/rbac";

export async function GET(req: Request) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const q = (searchParams.get("q") || "").trim();

  const orders = await db.order.findMany({
    where: {
      ...(status !== "all" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { orderNo: { contains: q } },
              { customerName: { contains: q } },
              { customerPhone: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const isPacker = guard.session.role === "PACKER";
  const safeOrders = isPacker
    ? orders.map((o) => ({
        ...o,
        items: o.items.map(({ unitCostBaht: _, ...item }) => item),
      }))
    : orders;

  return NextResponse.json({ orders: safeOrders, role: guard.session.role });
}
