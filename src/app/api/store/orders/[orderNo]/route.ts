import { NextResponse } from "next/server";
import { getOrderPaymentDetail } from "@/services/payment.service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderNo: string }> }
) {
  const { orderNo } = await context.params;
  const detail = await getOrderPaymentDetail(orderNo.toUpperCase());
  if (!detail) {
    return NextResponse.json({ error: "ไม่พบคำสั่งซื้อนี้" }, { status: 404 });
  }
  return NextResponse.json({
    order: {
      orderNo: detail.order.orderNo,
      status: detail.order.status,
      customerName: detail.order.customerName,
      paymentMethod: detail.order.paymentMethod,
      deliveryMethod: detail.order.deliveryMethod,
      subtotalBaht: detail.order.subtotalBaht,
      discountBaht: detail.order.discountBaht,
      shippingBaht: detail.order.shippingBaht,
      codFeeBaht: detail.order.codFeeBaht,
      totalBaht: detail.order.totalBaht,
      expiresAt: detail.order.expiresAt,
      items: detail.order.items,
      payments: detail.order.payments.map((p) => ({
        id: p.id,
        status: p.status,
        provider: p.provider,
        rejectReason: p.rejectReason,
        createdAt: p.createdAt,
      })),
    },
    promptpayId: detail.promptpayId,
    promptpayName: detail.promptpayName,
    qrDataUrl: detail.qrDataUrl,
  });
}
