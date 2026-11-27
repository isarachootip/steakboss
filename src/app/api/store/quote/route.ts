import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
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
    const session = await getSession();
    const q = await quoteCart(parsed.data, {
      isWholesaleRole: session?.role === "WHOLESALE",
    });
    return NextResponse.json({
      pricingTier: q.pricingTier,
      qualifiesWholesale: q.qualifiesWholesale,
      totalPacks: q.totalPacks,
      packsToWholesale: q.packsToWholesale,
      retailSubtotalBaht: q.retailSubtotalBaht,
      tierSavingsBaht: q.tierSavingsBaht,
      subtotalBaht: q.subtotalBaht,
      discountBaht: q.discountBaht,
      couponApplied: q.couponApplied,
      couponError: q.couponError,
      zone: q.zone,
      shippingBaht: q.shippingBaht,
      codFeeBaht: q.codFeeBaht,
      totalBaht: q.totalBaht,
      amountToFreeShipping: q.amountToFreeShipping,
      lines: q.resolvedLines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        unitPriceBaht: l.unitPriceBaht,
        retailUnitBaht: l.retailUnitBaht,
        lineTotalBaht: l.lineTotal,
        appliedTier: l.appliedTier,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "คำนวณยอดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
