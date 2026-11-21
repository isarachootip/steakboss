import { NextResponse } from "next/server";
import { submitSlipSchema } from "@/schemas/order.schema";
import { submitOrderSlip } from "@/services/payment.service";

export async function POST(
  req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await context.params;
    const body = await req.json();
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
