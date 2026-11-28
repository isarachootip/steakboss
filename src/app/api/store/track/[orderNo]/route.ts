import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { lookupOrderForAuthenticatedUser } from "@/services/order.service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { orderNo } = await context.params;
  const result = await lookupOrderForAuthenticatedUser(orderNo, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ order: result.order });
}
