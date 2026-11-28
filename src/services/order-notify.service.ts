import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/order";
import {
  buildOrderFlexMessage,
  buildPromptPayOrderFlexMessage,
  pushLineMessage,
} from "./adapters/line.adapter";
import { getStoreSettings } from "./settings.service";

export async function notifyOrderStatus(
  orderNo: string,
  status: OrderStatus
): Promise<void> {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { user: { select: { lineUserId: true } } },
  });
  if (!order) return;

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const trackUrl = `${baseUrl}/track?orderNo=${encodeURIComponent(order.orderNo)}`;
  const detail =
    status === "SHIPPED" && order.trackingNo
      ? `ขนส่ง ${order.carrier || "รถเย็น"} เลขพัสดุ ${order.trackingNo}`
      : `สถานะปัจจุบัน: ${ORDER_STATUS_LABELS[status]}`;

  if (order.user?.lineUserId) {
    if (status === "PENDING_PAYMENT" && order.paymentMethod === "PROMPTPAY") {
      const settings = await getStoreSettings();
      await pushLineMessage(order.user.lineUserId, [
        buildPromptPayOrderFlexMessage({
          orderNo: order.orderNo,
          totalBaht: order.totalBaht,
          promptpayId: settings.promptpayId,
          promptpayName: settings.promptpayName,
          qrImageUrl: `${baseUrl}/api/store/qr/${encodeURIComponent(order.orderNo)}.png`,
          payUrl: `${baseUrl}/orders/${encodeURIComponent(order.orderNo)}/pay`,
          trackUrl,
        }),
      ]);
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
