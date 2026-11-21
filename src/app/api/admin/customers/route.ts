import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";

export async function GET() {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const orders = await db.order.findMany({
    include: { user: { select: { lineUserId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<
    string,
    {
      phone: string;
      name: string;
      email: string;
      address: string;
      postalCode: string;
      hasLine: boolean;
      orderCount: number;
      totalSpentBaht: number;
      lastOrderAt: Date;
    }
  >();

  for (const o of orders) {
    const existing = map.get(o.customerPhone);
    const isLive = o.status !== "CANCELLED";
    if (!existing) {
      map.set(o.customerPhone, {
        phone: o.customerPhone,
        name: o.customerName,
        email: o.customerEmail,
        address: o.addressText,
        postalCode: o.postalCode,
        hasLine: Boolean(o.user?.lineUserId),
        orderCount: isLive ? 1 : 0,
        totalSpentBaht: isLive ? o.totalBaht : 0,
        lastOrderAt: o.createdAt,
      });
    } else {
      if (isLive) {
        existing.orderCount += 1;
        existing.totalSpentBaht += o.totalBaht;
      }
      if (o.user?.lineUserId) existing.hasLine = true;
    }
  }

  const customers = Array.from(map.values()).sort(
    (a, b) => b.totalSpentBaht - a.totalSpentBaht
  );
  return NextResponse.json({ customers });
}
