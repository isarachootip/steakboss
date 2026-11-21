import { NextResponse } from "next/server";
import { trackQuerySchema } from "@/schemas/order.schema";
import { lookupOrderForTracking } from "@/services/order.service";

export async function POST(req: Request) {
  const body = await req.json();
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
