import { db } from "@/lib/db";
import {
  canTransitionOrder,
  isOrderStatus,
  ORDER_STATUS_LABELS,
  shouldReleaseStockOnCancel,
  type OrderStatus,
} from "@/domain/order";
import { notifyOrderStatus, releaseOrderStock } from "./order-lifecycle.service";
import type { z } from "zod";
import type { adminUpdateOrderSchema } from "@/schemas/order.schema";

export async function lookupOrderForTracking(orderNo: string, phoneLast4: string) {
  const cleanNo = orderNo.trim().toUpperCase();
  const order = await db.order.findUnique({
    where: { orderNo: cleanNo },
    include: {
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPriceBaht: true,
          lineTotalBaht: true,
        },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return { ok: false as const, error: "ไม่พบเลขคำสั่งซื้อนี้ในระบบ" };
  if (order.customerPhone.slice(-4) !== phoneLast4.trim()) {
    return { ok: false as const, error: "เบอร์โทร 4 ตัวท้ายไม่ตรงกับคำสั่งซื้อ" };
  }
  return {
    ok: true as const,
    order: {
      orderNo: order.orderNo,
      status: order.status,
      statusLabel: isOrderStatus(order.status)
        ? ORDER_STATUS_LABELS[order.status]
        : order.status,
      customerName: order.customerName,
      deliveryMethod: order.deliveryMethod,
      shippingZone: order.shippingZone,
      paymentMethod: order.paymentMethod,
      totalBaht: order.totalBaht,
      carrier: order.carrier,
      trackingNo: order.trackingNo,
      createdAt: order.createdAt,
      items: order.items,
      events: order.events,
    },
  };
}

export async function updateOrderByAdmin(
  orderNo: string,
  input: z.infer<typeof adminUpdateOrderSchema>,
  actorId: string
) {
  const existing = await db.order.findUnique({ where: { orderNo } });
  if (!existing) throw new Error("ไม่พบคำสั่งซื้อนี้");

  const currentStatus = existing.status as OrderStatus;
  if (!canTransitionOrder(currentStatus, input.status)) {
    throw new Error(
      `ไม่สามารถเปลี่ยนสถานะจาก ${ORDER_STATUS_LABELS[currentStatus]} เป็น ${ORDER_STATUS_LABELS[input.status]} ได้`
    );
  }

  const updated = await db.order.update({
    where: { orderNo },
    data: {
      status: input.status,
      carrier: input.carrier !== undefined ? input.carrier : existing.carrier,
      trackingNo:
        input.trackingNo !== undefined ? input.trackingNo : existing.trackingNo,
      codSettled:
        input.codSettled !== undefined ? input.codSettled : existing.codSettled,
      events:
        input.status !== currentStatus || input.note
          ? {
              create: {
                status: input.status,
                note:
                  input.note ||
                  (input.trackingNo
                    ? `ขนส่ง ${input.carrier || ""} เลขพัสดุ ${input.trackingNo}`.trim()
                    : ""),
                actorId,
              },
            }
          : undefined,
    },
    include: { items: true, events: true, payments: true },
  });

  if (input.status === "CANCELLED" && shouldReleaseStockOnCancel(currentStatus)) {
    await releaseOrderStock(
      existing.id,
      existing.orderNo,
      "ยกเลิกออเดอร์โดยแอดมิน",
      actorId
    );
  }
  if (input.status !== currentStatus) {
    await notifyOrderStatus(orderNo, input.status);
  }
  return updated;
}
