import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  buildCategoryCarouselFlex,
  buildProductCarouselFlex,
} from "@/services/adapters/line-catalog-flex";
import { buildPromptPayOrderFlexMessage } from "@/services/adapters/line-flex";
import { handleIncomingChatMessage } from "@/services/chatbot.service";
import { upsertCustomerFromLineProfile } from "@/services/line-login.service";
import {
  handleIncomingLineImage,
  handleLineConfirmDeliveredPostback,
} from "@/services/line-slip.service";
import { createOrder, updateOrderByAdmin } from "@/services/order.service";
import { reviewOrderSlip } from "@/services/payment.service";

describe("Hybrid LINE ordering (Flex menu, chat slip upload, confirm delivered, auto-track)", () => {
  it("builds PromptPay QR Flex card and category/product carousels cleanly", () => {
    const payFlex = buildPromptPayOrderFlexMessage({
      orderNo: "SB261128-9999",
      totalBaht: 250,
      promptpayId: "0932896292",
      promptpayName: "วรัป เจริญโพธิ์",
      qrImageUrl: "https://steakboss.odmfood.online/api/store/qr/SB261128-9999.png",
      payUrl: "https://steakboss.odmfood.online/orders/SB261128-9999/pay",
      trackUrl: "https://steakboss.odmfood.online/track?orderNo=SB261128-9999",
    });
    expect(payFlex.type).toBe("flex");
    expect(JSON.stringify(payFlex.contents)).toContain("0932896292");
    expect(JSON.stringify(payFlex.contents)).toContain("วรัป เจริญโพธิ์");
    expect(JSON.stringify(payFlex.contents)).toContain("/api/store/qr/SB261128-9999.png");

    const catFlex = buildCategoryCarouselFlex(
      [{ name: "ปลา", count: 14, imageUrl: "/images/products/fish-saba-teriyaki.jpg" }],
      "https://steakboss.odmfood.online"
    );
    expect(JSON.stringify(catFlex.contents)).toContain("ดูเมนู ปลา");

    const prodFlex = buildProductCarouselFlex(
      "ปลา",
      [
        {
          slug: "fish-saba",
          name: "ปลาซาบะยาว KB",
          priceBaht: 95,
          wholesalePriceBaht: 76,
          weightGrams: 170,
          platedImgUrl: "/images/products/fish-saba-teriyaki.jpg",
        },
      ],
      "https://steakboss.odmfood.online"
    );
    expect(JSON.stringify(prodFlex.contents)).toContain("/liff?next=");
  });

  it("handles LINE chat slip image ingestion, duplicate guard, auto-tracking, Flex menu, and delivered postback", async () => {
    const stamp = Date.now();
    const lineId = `U_LINE_ORD_${stamp}`;
    const kp = await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } });
    const tmpUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "sb-line-slip-"));
    let userId = "";
    let orderId = "";

    try {
      const user = await upsertCustomerFromLineProfile({
        userId: lineId,
        displayName: "ลูกค้าสั่งผ่านไลน์",
      });
      userId = user.id;

      // 1. Greeting "สวัสดี" and "โปรโมชั่น" in LINE return Quick Reply pills
      const greetReply = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineId,
        customerName: user.name,
        userId: user.id,
        content: "สวัสดี",
      });
      expect(greetReply.flexMessages?.[0]?.quickReply?.items.map((i) => i.action.label)).toEqual(
        expect.arrayContaining([
          "🥩 ดูเมนูสเต๊ก",
          "🛒 สั่งซื้อเลย",
          "🚚 ค่าขนส่ง",
          "📦 ติดตามสถานะ",
          "💬 คุยแอดมิน",
        ])
      );

      const promoReply = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineId,
        customerName: user.name,
        userId: user.id,
        content: "โปรโมชั่น",
      });
      expect(promoReply.reply).toContain("โปรโมชั่น");
      expect(promoReply.flexMessages?.[0]?.quickReply?.items.length).toBeGreaterThanOrEqual(5);

      // 2. Typing "ดูเมนู" in LINE returns Category Flex Carousel + Quick Reply
      const menuReply = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineId,
        customerName: user.name,
        userId: user.id,
        content: "ดูเมนู",
      });
      expect(menuReply.flexMessages?.length).toBe(1);
      expect(menuReply.flexMessages?.[0]?.quickReply?.items.length).toBeGreaterThanOrEqual(5);

      // 2b. Creating a COD order on LINE or WEB channel MUST be rejected (QR PromptPay + slip only)
      for (const ch of ["LINE", "WEB"] as const) {
        await expect(
          createOrder(
            {
              items: [{ productId: kp.id, quantity: 1 }],
              customerName: user.name,
              customerPhone: `08${String(stamp).slice(-8)}`,
              customerEmail: "",
              deliveryMethod: "FACTORY_PICKUP",
              postalCode: "",
              addressText: "",
              paymentMethod: "COD" as unknown as "PROMPTPAY",
              couponCode: "",
              note: "",
              channel: ch,
            },
            user.id,
            "CUSTOMER"
          )
        ).rejects.toThrow("QR พร้อมเพย์");
      }

      // 2c. Asking payment info on LINE before placing order states PromptPay QR only (no COD)
      const payInfoReply = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineId,
        customerName: user.name,
        userId: user.id,
        content: "จ่ายเงินยังไง",
      });
      expect(payInfoReply.reply).toContain("QR พร้อมเพย์");
      expect(payInfoReply.reply).toContain("ไม่มีบริการเก็บเงินปลายทาง");

      // 3. Customer creates a LINE PromptPay order (must stay PENDING_PAYMENT & not deduct stock)
      const order = await createOrder(
        {
          items: [{ productId: kp.id, quantity: 1 }],
          customerName: user.name,
          customerPhone: `08${String(stamp).slice(-8)}`,
          customerEmail: "",
          deliveryMethod: "FACTORY_PICKUP",
          postalCode: "",
          addressText: "",
          paymentMethod: "PROMPTPAY",
          couponCode: "",
          note: "",
          channel: "LINE",
        },
        user.id,
        "CUSTOMER"
      );
      orderId = order.id;
      expect(order.status).toBe("PENDING_PAYMENT");
      expect(order.stockDeducted).toBe(false);

      // Admin MUST NOT be able to mark PENDING_PAYMENT as PAID without a verified slip
      await expect(
        updateOrderByAdmin(order.orderNo, { status: "PAID" }, "test-admin")
      ).rejects.toThrow();

      // Asking for QR / payment in LINE while order is PENDING_PAYMENT returns PromptPay QR Flex card
      const qrReply = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineId,
        customerName: user.name,
        userId: user.id,
        content: "ขอ QR ชำระเงิน",
      });
      expect(qrReply.flexMessages?.length).toBe(1);
      expect(JSON.stringify(qrReply.flexMessages?.[0])).toContain(
        `/api/store/qr/${order.orderNo}.png`
      );

      // 3b. Typing "เช็กสถานะพัสดุ" auto-tracks latest PENDING_PAYMENT order AND includes QR Flex card
      const trackReply = await handleIncomingChatMessage({
        channel: "LINE",
        externalId: lineId,
        customerName: user.name,
        userId: user.id,
        content: "เช็กสถานะพัสดุ",
      });
      expect(trackReply.reply).toContain(order.orderNo);
      expect(JSON.stringify(trackReply.flexMessages?.[0])).toContain(
        `/api/store/qr/${order.orderNo}.png`
      );

      // 4. Customer sends slip image directly in LINE chat
      const sampleImg = await sharp({
        create: { width: 320, height: 480, channels: 3, background: { r: 245, g: 245, b: 245 } },
      })
        .jpeg({ quality: 80 })
        .toBuffer();

      const slipRes = await handleIncomingLineImage({
        lineUserId: lineId,
        customerName: user.name,
        userId: user.id,
        messageId: `msg-${stamp}`,
        downloadFn: async () => ({ buffer: sampleImg, contentType: "image/jpeg" }),
        uploadDir: tmpUploadDir,
      });
      expect(slipRes.orderNo).toBe(order.orderNo);
      expect(slipRes.orderStatus).toBe("SLIP_SUBMITTED");

      // Even after slip is submitted (pending review), updateOrderByAdmin cannot skip slip approval
      await expect(
        updateOrderByAdmin(order.orderNo, { status: "PAID" }, "test-admin")
      ).rejects.toThrow("อนุมัติสลิป");

      // Approving the submitted slip via reviewOrderSlip confirms payment as PAID
      const pendingPayment = await db.payment.findFirstOrThrow({
        where: { orderId: order.id, status: "PENDING" },
      });
      const approved = await reviewOrderSlip(
        order.orderNo,
        { paymentId: pendingPayment.id, decision: "APPROVE", rejectReason: "" },
        "test-admin"
      );
      expect(approved.orderStatus).toBe("PAID");

      // Duplicate image sent again must be rejected cleanly (order is now PAID -> not pending)
      const secondOrder = await createOrder(
        {
          items: [{ productId: kp.id, quantity: 1 }],
          customerName: user.name,
          customerPhone: `08${String(stamp).slice(-8)}`,
          customerEmail: "",
          deliveryMethod: "FACTORY_PICKUP",
          postalCode: "",
          addressText: "",
          paymentMethod: "PROMPTPAY",
          couponCode: "",
          note: "",
          channel: "LINE",
        },
        user.id,
        "CUSTOMER"
      );
      try {
        const dupRes = await handleIncomingLineImage({
          lineUserId: lineId,
          customerName: user.name,
          userId: user.id,
          messageId: `msg-dup-${stamp}`,
          downloadFn: async () => ({ buffer: sampleImg, contentType: "image/jpeg" }),
          uploadDir: tmpUploadDir,
        });
        expect(dupRes.reply).toContain("ถูกใช้งานในระบบไปแล้ว");
      } finally {
        await db.order.deleteMany({ where: { id: secondOrder.id } });
      }

      // 5. After admin marks SHIPPED, customer taps "ยืนยันได้รับสินค้าแล้ว" postback
      await db.order.update({ where: { id: order.id }, data: { status: "SHIPPED" } });
      const confirmRes = await handleLineConfirmDeliveredPostback(lineId, order.orderNo);
      expect(confirmRes.ok).toBe(true);
      const afterConfirm = await db.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(afterConfirm.status).toBe("DELIVERED");
    } finally {
      await fs.rm(tmpUploadDir, { recursive: true, force: true });
      if (orderId) {
        const latest = await db.order.findUnique({ where: { id: orderId } });
        if (latest?.stockDeducted) {
          await db.product.update({ where: { id: kp.id }, data: { stockQty: { increment: 1 } } });
          await db.stockMovement.deleteMany({ where: { orderNo: latest.orderNo } });
        }
        await db.order.deleteMany({ where: { id: orderId } });
      }
      await db.chatThread.deleteMany({ where: { externalId: lineId } });
      if (userId) await db.user.deleteMany({ where: { id: userId } });
    }
  });
});
