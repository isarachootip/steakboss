import { db } from "@/lib/db";
import { downloadLineMessageContent } from "./adapters/line.adapter";
import { saveUploadedImage } from "./upload.service";
import { submitOrderSlip } from "./payment.service";

export interface LineImageHandlerParams {
  lineUserId: string;
  customerName: string;
  userId?: string;
  messageId: string;
  downloadFn?: (
    messageId: string
  ) => Promise<{ buffer: Buffer; contentType: string } | null>;
  uploadDir?: string;
}

export async function handleIncomingLineImage(params: LineImageHandlerParams) {
  const thread = await db.chatThread.upsert({
    where: { channel_externalId: { channel: "LINE", externalId: params.lineUserId } },
    update: {
      lastMessageAt: new Date(),
      customerName: params.customerName,
      ...(params.userId ? { userId: params.userId } : {}),
    },
    create: {
      channel: "LINE",
      externalId: params.lineUserId,
      customerName: params.customerName,
      userId: params.userId ?? null,
      mode: "BOT",
    },
  });

  const download = params.downloadFn ?? ((id: string) => downloadLineMessageContent(id));
  const downloaded = await download(params.messageId);
  if (!downloaded) {
    const reply = "ขออภัยครับ ระบบไม่สามารถดาวน์โหลดรูปภาพจาก LINE ได้ กรุณาส่งใหม่อีกครั้งหรือแนบสลิปผ่านหน้าเว็บครับ";
    await db.chatMessage.create({ data: { threadId: thread.id, sender: "BOT", content: reply } });
    return { threadId: thread.id, reply, orderNo: null, orderStatus: null };
  }

  let savedUrl: string | null = null;
  let slipBase64 = `data:${downloaded.contentType};base64,${downloaded.buffer.toString("base64")}`;
  try {
    const saved = await saveUploadedImage(
      { buffer: downloaded.buffer, mimeType: downloaded.contentType, preset: "product" },
      params.uploadDir
    );
    savedUrl = saved.url;
  } catch {
    // Keep original base64 if image optimization fails
  }

  await db.chatMessage.create({
    data: {
      threadId: thread.id,
      sender: "CUSTOMER",
      content: "[ส่งรูปภาพผ่าน LINE]",
      mediaUrl: savedUrl,
    },
  });

  const now = new Date();
  const ownerFilters = [
    { user: { lineUserId: params.lineUserId } },
    ...(params.userId ? [{ userId: params.userId }] : []),
  ];
  const pendingOrder = await db.order.findFirst({
    where: {
      paymentMethod: "PROMPTPAY",
      status: { in: ["PENDING_PAYMENT", "SLIP_SUBMITTED"] },
      AND: [
        { OR: ownerFilters },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, orderNo: true, totalBaht: true },
  });

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://steakboss.odmfood.online").replace(/\/$/, "");
  if (!pendingOrder) {
    const reply = `ได้รับรูปภาพแล้วครับ (ส่งต่อเข้า Inbox แอดมินเรียบร้อย)\nหากต้องการสั่งซื้อสเต๊ก สามารถกดดูเมนูได้ที่ ${baseUrl}/liff หรือพิมพ์ "ดูเมนู" ได้เลยครับ`;
    await db.chatMessage.create({ data: { threadId: thread.id, sender: "BOT", content: reply } });
    return { threadId: thread.id, reply, orderNo: null, orderStatus: null };
  }

  try {
    const result = await submitOrderSlip(pendingOrder.orderNo, {
      slipBase64,
      autoVerifyDemo: false,
    });
    let reply = "";
    if (result.orderStatus === "PAID") {
      reply = `ตรวจสอบสลิปออเดอร์ ${pendingOrder.orderNo} ผ่านเรียบร้อยแล้วครับ!\nระบบยืนยันการชำระเงินและตัดสต็อกให้แล้ว ทีมงานห้องเย็นจะรีบจัดแพ็คและแจ้งเลขพัสดุให้ทันทีครับ`;
    } else if (result.orderStatus === "PENDING_PAYMENT") {
      reply = `สลิปสำหรับออเดอร์ ${pendingOrder.orderNo} ไม่ผ่านการตรวจสอบครับ\nเหตุผล: ${result.reason || "ยอดเงินหรือบัญชีผู้รับไม่ตรง"}\nกรุณาตรวจสอบแล้วส่งภาพสลิปใหม่อีกครั้งได้เลยครับ`;
    } else {
      reply = `ได้รับสลิปสำหรับออเดอร์ ${pendingOrder.orderNo} (ยอด ฿${pendingOrder.totalBaht.toLocaleString("th-TH")}) เรียบร้อยแล้วครับ\nสถานะปัจจุบัน: รอตรวจสอบสลิป (ยังไม่ยืนยันออเดอร์) เมื่อตรวจสอบผ่านระบบจะยืนยันคำสั่งซื้อและตัดสต็อกให้ทันทีครับ`;
    }
    await db.chatMessage.create({ data: { threadId: thread.id, sender: "BOT", content: reply } });
    return { threadId: thread.id, reply, orderNo: pendingOrder.orderNo, orderStatus: result.orderStatus };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ไม่สามารถตรวจสอบสลิปได้";
    const reply = `ไม่สามารถบันทึกสลิปสำหรับออเดอร์ ${pendingOrder.orderNo} ได้ครับ: ${msg}`;
    await db.chatMessage.create({ data: { threadId: thread.id, sender: "BOT", content: reply } });
    return { threadId: thread.id, reply, orderNo: pendingOrder.orderNo, orderStatus: null };
  }
}

export async function handleLineConfirmDeliveredPostback(
  lineUserId: string,
  orderNo: string
): Promise<{ ok: boolean; reply: string }> {
  const cleanNo = orderNo.trim().toUpperCase();
  const order = await db.order.findUnique({
    where: { orderNo: cleanNo },
    include: { user: { select: { lineUserId: true } } },
  });

  if (!order || order.user?.lineUserId !== lineUserId) {
    return { ok: false, reply: "ไม่พบสิทธิ์ยืนยันคำสั่งซื้อนี้ในบัญชี LINE ของคุณครับ" };
  }
  if (order.status === "DELIVERED") {
    return { ok: true, reply: `ออเดอร์ ${order.orderNo} ยืนยันรับสินค้าเรียบร้อยแล้วครับ ขอบคุณที่อุดหนุน SteakBoss นะครับ` };
  }
  if (order.status !== "SHIPPED") {
    return { ok: false, reply: `ออเดอร์ ${order.orderNo} ยังไม่อยู่ในสถานะจัดส่งแล้วครับ` };
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "DELIVERED",
      events: {
        create: {
          status: "DELIVERED",
          note: "ลูกค้ากดยืนยันได้รับสินค้าแล้วผ่าน LINE",
        },
      },
    },
  });

  return {
    ok: true,
    reply: `ขอบคุณที่ยืนยันการรับสินค้าสำหรับออเดอร์ ${order.orderNo} ครับ!\nหากต้องการสั่งซ้ำสามารถพิมพ์ "ดูเมนู" ได้ทุกเมื่อเลยนะครับ`,
  };
}
