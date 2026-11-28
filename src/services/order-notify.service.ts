import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/order";
import {
  buildOrderFlexMessage,
  pushLineMessage,
} from "./adapters/line.adapter";
import {
  buildPromptPayFlexForOrder,
  resolvePublicHttpsBaseUrl,
} from "./line-payment-reply.service";

export async function notifyOrderStatus(
  orderNo: string,
  status: OrderStatus
): Promise<void> {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { user: { select: { lineUserId: true } } },
  });
  if (!order) return;

  const baseUrl = resolvePublicHttpsBaseUrl();
  const trackUrl = `${baseUrl}/track?orderNo=${encodeURIComponent(order.orderNo)}`;
  const detail =
    status === "SHIPPED" && order.trackingNo
      ? `ขนส่ง ${order.carrier || "รถเย็น"} เลขพัสดุ ${order.trackingNo}`
      : `สถานะปัจจุบัน: ${ORDER_STATUS_LABELS[status]}`;

  if (order.user?.lineUserId) {
    if (status === "PENDING_PAYMENT" && order.paymentMethod === "PROMPTPAY") {
      const qrFlex = await buildPromptPayFlexForOrder({
        orderNo: order.orderNo,
        totalBaht: order.totalBaht,
        includeQuickReply: true,
      });
      await pushLineMessage(order.user.lineUserId, [qrFlex]);
    } else {
      await pushLineMessage(order.user.lineUserId, [
        buildOrderFlexMessage({
          orderNo: order.orderNo,
          statusLabel: ORDER_STATUS_LABELS[status],
          totalBaht: order.totalBaht,
          detailLine: detail,
          trackUrl,
          confirmDeliveredOrderNo: status === "SHIPPED" ? order.orderNo : undefined,
        }),
      ]);
    }
  }

  const staffGroupId = process.env.LINE_STAFF_GROUP_ID?.trim();
  if (
    staffGroupId &&
    (status === "PENDING_PAYMENT" ||
      status === "CONFIRMED" ||
      status === "SLIP_SUBMITTED" ||
      status === "PAID")
  ) {
    await pushLineMessage(staffGroupId, [
      {
        type: "text",
        text: `[Steakboss] ออเดอร์ ${order.orderNo} (${ORDER_STATUS_LABELS[status]}) ยอด ฿${order.totalBaht.toLocaleString("th-TH")} — คุณ${order.customerName}`,
      },
    ]);
  }
}
