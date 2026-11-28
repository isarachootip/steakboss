import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { trackQuerySchema } from "@/schemas/order.schema";
import { lookupOrderForTracking } from "@/services/order.service";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`track:${ip}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `ค้นหาพัสดุบ่อยเกินไป กรุณารออีก ${rl.retryAfterSec} วินาที` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body: unknown = await req.json();
  const parsed = trackQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "กรุณากรอกข้อมูลให้ครบ" },
      { status: 400 }
    );
  }
  const result = await lookupOrderForTracking(
    parsed.data.orderNo,
    parsed.data.phoneLast4
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ order: result.order });
}
