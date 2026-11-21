import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { checkoutRequestSchema } from "@/schemas/order.schema";
import { createOrder } from "@/services/order.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  const orders = await db.order.findMany({
    where: user?.phone
      ? { OR: [{ userId: session.userId }, { customerPhone: user.phone }] }
      : { userId: session.userId },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = checkoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลการสั่งซื้อไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const session = await getSession();
    const order = await createOrder(
      parsed.data,
      session?.role === "CUSTOMER" ? session.userId : undefined
    );
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ไม่สามารถสร้างคำสั่งซื้อได้";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
