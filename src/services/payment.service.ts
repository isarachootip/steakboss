import QRCode from "qrcode";
import { db } from "@/lib/db";
import { buildPromptPayPayload } from "@/domain/promptpay";
import { getStoreSettings } from "./settings.service";
import { computeSlipHash, verifySlipWithAdapter } from "./adapters/slip.adapter";
import { deductOrderStockInTx, notifyOrderStatus } from "./order-lifecycle.service";
import type { z } from "zod";
import type { reviewSlipSchema, submitSlipSchema } from "@/schemas/order.schema";

export async function getOrderPaymentDetail(orderNo: string) {
  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { orderNo },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    getStoreSettings(),
  ]);
  if (!order) return null;

  let qrDataUrl: string | null = null;
  if (order.paymentMethod === "PROMPTPAY" && settings.promptpayId) {
    const payload = buildPromptPayPayload(settings.promptpayId, order.totalBaht);
    qrDataUrl = await QRCode.toDataURL(payload, { width: 280, margin: 1 });
  }

  return {
    order,
    promptpayId: settings.promptpayId,
    promptpayName: settings.promptpayName,
    qrDataUrl,
  };
}

export async function submitOrderSlip(
  orderNo: string,
  input: z.infer<typeof submitSlipSchema>
) {
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { orderNo } }),
    getStoreSettings(),
  ]);
  if (!order) throw new Error("ไม่พบคำสั่งซื้อนี้");
  if (order.paymentMethod !== "PROMPTPAY") {
    throw new Error("คำสั่งซื้อนี้เป็นแบบเก็บเงินปลายทาง ไม่ต้องแนบสลิป");
  }
  if (!["PENDING_PAYMENT", "SLIP_SUBMITTED"].includes(order.status)) {
    throw new Error("คำสั่งซื้อนี้ไม่อยู่ในสถานะรอชำระเงิน");
  }

  const slipHash = computeSlipHash(input.slipBase64);
  const dupHash = await db.payment.findUnique({ where: { slipHash } });
  if (dupHash) {
    throw new Error("สลิปนี้ถูกใช้งานในระบบไปแล้ว ไม่สามารถส่งซ้ำได้");
  }

  if (input.transRef?.trim()) {
    const dupRef = await db.payment.findUnique({
      where: { slipTransRef: input.transRef.trim() },
    });
    if (dupRef) {
      throw new Error("เลขอ้างอิงสลิปนี้ถูกใช้งานในระบบไปแล้ว");
    }
  }

  const result = await verifySlipWithAdapter({
    slipBase64: input.slipBase64,
    expectedAmountBaht: order.totalBaht,
    expectedPromptPayId: settings.promptpayId,
    expectedPromptPayName: settings.promptpayName,
    transRef: input.transRef,
  });

  if (result.transRef) {
    const dupRef = await db.payment.findUnique({
      where: { slipTransRef: result.transRef },
    });
    if (dupRef) {
      throw new Error("เลขอ้างอิงสลิปนี้ถูกใช้งานในระบบไปแล้ว");
    }
  }

  const paymentStatus =
    result.status === "VERIFIED" ? "VERIFIED" : result.status === "REJECTED" ? "REJECTED" : "PENDING";
  const nextOrderStatus =
    result.status === "VERIFIED" ? "PAID" : result.status === "REJECTED" ? "PENDING_PAYMENT" : "SLIP_SUBMITTED";

  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        orderId: order.id,
        method: "PROMPTPAY",
        status: paymentStatus,
        amountBaht: order.totalBaht,
        slipUrl: input.slipBase64,
        slipHash: result.slipHash,
        slipTransRef: result.transRef,
        provider: result.provider,
        rejectReason: result.reason ?? null,
        verifiedAt: paymentStatus === "VERIFIED" ? new Date() : null,
      },
    });

    let shortageNote = "";
    if (paymentStatus === "VERIFIED") {
      const deductRes = await deductOrderStockInTx(tx, order.id, order.orderNo, null);
      if (deductRes.shortages.length > 0) {
        shortageNote = ` · [แจ้งแอดมิน: สต็อกไม่พอ ${deductRes.shortages.join(", ")}]`;
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextOrderStatus,
        events: {
          create: {
            status: nextOrderStatus,
            note:
              paymentStatus === "VERIFIED"
                ? `ตรวจสลิปอัตโนมัติผ่าน (${result.provider}) และตัดสต็อกแล้ว${shortageNote}`
                : paymentStatus === "REJECTED"
                  ? `สลิปไม่ผ่าน: ${result.reason ?? ""}`
                  : result.reason || "ลูกค้าแนบสลิปแล้ว รอแอดมินตรวจสอบ",
          },
        },
      },
    });
    return p;
  });

  await notifyOrderStatus(orderNo, nextOrderStatus);
  return { payment, orderStatus: nextOrderStatus, reason: result.reason };
}

export async function reviewOrderSlip(
  orderNo: string,
  input: z.infer<typeof reviewSlipSchema>,
  adminId: string
) {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { payments: { where: { id: input.paymentId }, take: 1 } },
  });
  if (!order) throw new Error("ไม่พบคำสั่งซื้อนี้");
  const targetPayment = order.payments[0];
  if (!targetPayment) throw new Error("ไม่พบรายการสลิปของคำสั่งซื้อนี้");
  if (input.decision === "APPROVE" && !targetPayment.slipUrl?.trim()) {
    throw new Error("ไม่พบรูปสลิปสำหรับตรวจสอบ ไม่สามารถอนุมัติการชำระเงินได้");
  }

  const nextStatus = input.decision === "APPROVE" ? "PAID" : "PENDING_PAYMENT";
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: input.decision === "APPROVE" ? "VERIFIED" : "REJECTED",
        verifiedById: adminId,
        verifiedAt: new Date(),
        rejectReason: input.decision === "REJECT" ? input.rejectReason || "สลิปไม่ถูกต้อง" : null,
      },
    });

    let shortageNote = "";
    if (input.decision === "APPROVE") {
      const deductRes = await deductOrderStockInTx(tx, order.id, order.orderNo, adminId);
      if (deductRes.shortages.length > 0) {
        shortageNote = ` · [สต็อกไม่พอ: ${deductRes.shortages.join(", ")}]`;
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        events: {
          create: {
            status: nextStatus,
            note:
              input.decision === "APPROVE"
                ? `แอดมินตรวจสอบสลิปและยืนยันรับยอด + ตัดสต็อกแล้ว${shortageNote}`
                : `ปฏิเสธสลิป: ${input.rejectReason || "กรุณาแนบสลิปใหม่"}`,
            actorId: adminId,
          },
        },
      },
    });
  });

  await notifyOrderStatus(orderNo, nextStatus);
  return { orderStatus: nextStatus };
}
