import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { submitSlipSchema } from "@/schemas/order.schema";
import { submitOrderSlip } from "@/services/payment.service";

export async function POST(
  req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`slip:${ip}`, {
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `ส่งสลิปบ่อยเกินไป กรุณารออีก ${rl.retryAfterSec} วินาที` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const { orderNo } = await context.params;
    const body: unknown = await req.json();
    const parsed = submitSlipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลสลิปไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const result = await submitOrderSlip(orderNo.toUpperCase(), parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ส่งสลิปไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
