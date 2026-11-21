import { db } from "@/lib/db";
import { expandStockDeductions } from "@/domain/inventory";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/order";
import { buildOrderFlexMessage, pushLineMessage } from "./adapters/line.adapter";

export async function releaseOrderStock(
  orderId: string,
  orderNo: string,
  reason: string,
  actorId?: string
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { include: { bundleComponents: true } },
        },
      },
    },
  });
  if (!order) return;

  const deductions = expandStockDeductions(
    order.items.map((item) => ({
      quantity: item.quantity,
      product: {
        id: item.productId,
        isBundle: item.product.isBundle,
        isActive: true,
        stockQty: item.product.stockQty,
        components: item.product.bundleComponents.map((b) => ({
          childProductId: b.childProductId,
          quantity: b.quantity,
          childStockQty: 0,
          childPriceBaht: 0,
        })),
      },
    }))
  );

  await db.$transaction(async (tx) => {
    for (const d of deductions) {
      await tx.product.update({
        where: { id: d.productId },
        data: { stockQty: { increment: d.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: d.productId,
          deltaQty: d.quantity,
          type: "RELEASE",
          reason,
          orderNo,
          actorId: actorId ?? null,
        },
      });
    }
  });
}

export async function cancelExpiredUnpaidOrders(): Promise<number> {
  const expired = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      expiresAt: { lt: new Date() },
    },
  });

  for (const order of expired) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        events: {
          create: {
            status: "CANCELLED",
            note: "ยกเลิกอัตโนมัติเนื่องจากเกินกำหนดชำระเงิน",
          },
        },
      },
    });
    await releaseOrderStock(
      order.id,
      order.orderNo,
      "คืนสต็อกอัตโนมัติ (เกินกำหนดโอน)"
    );
  }
  return expired.length;
}

export async function notifyOrderStatus(
  orderNo: string,
  status: OrderStatus
): Promise<void> {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { user: { select: { lineUserId: true } } },
  });
  if (!order) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const trackUrl = `${baseUrl}/track?orderNo=${encodeURIComponent(order.orderNo)}`;
  const detail =
    status === "SHIPPED" && order.trackingNo
      ? `ขนส่ง ${order.carrier || "รถเย็น"} เลขพัสดุ ${order.trackingNo}`
      : `สถานะปัจจุบัน: ${ORDER_STATUS_LABELS[status]}`;

  if (order.user?.lineUserId) {
    await pushLineMessage(order.user.lineUserId, [
      buildOrderFlexMessage({
        orderNo: order.orderNo,
        statusLabel: ORDER_STATUS_LABELS[status],
        totalBaht: order.totalBaht,
        detailLine: detail,
        trackUrl,
      }),
    ]);
  }

  const staffGroupId = process.env.LINE_STAFF_GROUP_ID?.trim();
  if (
    staffGroupId &&
    (status === "PENDING_PAYMENT" ||
      status === "CONFIRMED" ||
      status === "SLIP_SUBMITTED")
  ) {
    await pushLineMessage(staffGroupId, [
      {
        type: "text",
        text: `[Steakboss] ออเดอร์ ${order.orderNo} (${ORDER_STATUS_LABELS[status]}) ยอด ฿${order.totalBaht.toLocaleString("th-TH")} — คุณ${order.customerName}`,
      },
    ]);
  }
}
