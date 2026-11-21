import { NextResponse } from "next/server";
import { quoteRequestSchema } from "@/schemas/order.schema";
import { quoteCart } from "@/services/order.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = quoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลตะกร้าไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const q = await quoteCart(parsed.data);
    return NextResponse.json({
      subtotalBaht: q.subtotalBaht,
      discountBaht: q.discountBaht,
      couponApplied: q.couponApplied,
      couponError: q.couponError,
      zone: q.zone,
      shippingBaht: q.shippingBaht,
      codFeeBaht: q.codFeeBaht,
      totalBaht: q.totalBaht,
      amountToFreeShipping: q.amountToFreeShipping,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "คำนวณยอดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
