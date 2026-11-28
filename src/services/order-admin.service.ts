import { db } from "@/lib/db";
import {
  canTransitionOrder,
  isOrderStatus,
  ORDER_STATUS_LABELS,
  shouldReleaseStockOnCancel,
  type OrderStatus,
} from "@/domain/order";
import {
  deductOrderStockInTx,
  notifyOrderStatus,
  releaseOrderStock,
} from "./order-lifecycle.service";
import type { z } from "zod";
import type { adminUpdateOrderSchema } from "@/schemas/order.schema";

function formatTrackedOrder(order: {
  orderNo: string;
  status: string;
  customerName: string;
  deliveryMethod: string;
  shippingZone: string;
  paymentMethod: string;
  totalBaht: number;
  carrier: string;
  trackingNo: string;
  createdAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceBaht: number;
    lineTotalBaht: number;
  }>;
  events: Array<{ status: string; note: string; createdAt: Date }>;
}) {
  return {
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
  };
}

const TRACK_INCLUDE = {
  items: {
    select: {
      productName: true,
      quantity: true,
      unitPriceBaht: true,
      lineTotalBaht: true,
    },
  },
  events: { orderBy: { createdAt: "asc" as const } },
};

export async function lookupOrderForTracking(orderNo: string, phoneLast4: string) {
  const cleanNo = orderNo.trim().toUpperCase();
  const order = await db.order.findUnique({
    where: { orderNo: cleanNo },
    include: TRACK_INCLUDE,
  });
  if (!order) return { ok: false as const, error: "ไม่พบเลขคำสั่งซื้อนี้ในระบบ" };
  if (order.customerPhone.slice(-4) !== phoneLast4.trim()) {
    return { ok: false as const, error: "เบอร์โทร 4 ตัวท้ายไม่ตรงกับคำสั่งซื้อ" };
  }
  return { ok: true as const, order: formatTrackedOrder(order) };
}

export async function lookupOrderForAuthenticatedUser(orderNo: string, userId: string) {
  const cleanNo = orderNo.trim().toUpperCase();
  const [order, user] = await Promise.all([
    db.order.findUnique({ where: { orderNo: cleanNo }, include: TRACK_INCLUDE }),
    db.user.findUnique({ where: { id: userId }, select: { phone: true, role: true } }),
  ]);
  if (!order) return { ok: false as const, error: "ไม่พบเลขคำสั่งซื้อนี้ในระบบ" };
  const isStaff = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "PACKER";
  const ownsOrder =
    isStaff ||
    order.userId === userId ||
    Boolean(user?.phone && order.customerPhone === user.phone);
  if (!ownsOrder) {
    return { ok: false as const, error: "ไม่พบสิทธิ์ดูคำสั่งซื้อนี้ในบัญชีของคุณ" };
  }
  return { ok: true as const, order: formatTrackedOrder(order) };
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

  const updated = await db.$transaction(async (tx) => {
    if (input.status === "PAID" && !existing.stockDeducted) {
      await deductOrderStockInTx(tx, existing.id, existing.orderNo, actorId);
    }
    return tx.order.update({
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
