import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createOrder, lookupOrderForTracking, quoteCart } from "@/services/order.service";
import { cancelExpiredUnpaidOrders } from "@/services/order-lifecycle.service";
import {
  getOrderPaymentDetail,
  reviewOrderSlip,
  submitOrderSlip,
} from "@/services/payment.service";

describe("order, multi-tier pricing & payment-confirmed stock deduction", () => {
  it("holds off stock deduction until slip payment is verified/approved, blocks duplicate slip & sandbox bypass, and avoids inflating stock on unpaid cancel", async () => {
    const setProd = await db.product.findUniqueOrThrow({ where: { slug: "best-seller-set-4" } });
    const kpBefore = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;

    // 2 sets @ 179 = 358, coupon BOSS50 = -50, net 308 + BKK ship 60 = 368
    const order = await createOrder({
      items: [{ productId: setProd.id, quantity: 2 }],
      customerName: "ทดสอบ บันเดิล",
      customerPhone: "0891112233",
      customerEmail: "test@example.com",
      deliveryMethod: "COLD_CHAIN",
      postalCode: "10110",
      addressText: "123 ถ.สุขุมวิท กทม.",
      paymentMethod: "PROMPTPAY",
      couponCode: "BOSS50",
      note: "",
      channel: "WEB",
    });

    try {
      expect(order.pricingTier).toBe("RETAIL");
      expect(order.subtotalBaht).toBe(358);
      expect(order.discountBaht).toBe(50);
      expect(order.shippingBaht).toBe(60);
      expect(order.totalBaht).toBe(368);
      expect(order.stockDeducted).toBe(false);

      // PromptPay order MUST NOT deduct stock before slip verification
      const kpAfterCheckout = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
      expect(kpAfterCheckout).toBe(kpBefore);

      const tracked = await lookupOrderForTracking(order.orderNo, "2233");
      expect(tracked.ok).toBe(true);
      const badTrack = await lookupOrderForTracking(order.orderNo, "9999");
      expect(badTrack.ok).toBe(false);

      // Submitting slip without Slip API key MUST go to SLIP_SUBMITTED even if autoVerifyDemo=true
      const fakeSlip = `data:image/png;base64,TESTSLIP-${order.orderNo}-UNIQUE`;
      const firstSlip = await submitOrderSlip(order.orderNo, {
        slipBase64: fakeSlip,
        autoVerifyDemo: true,
      });
      expect(firstSlip.orderStatus).toBe("SLIP_SUBMITTED");

      // Duplicate slip must be blocked
      await expect(
        submitOrderSlip(order.orderNo, { slipBase64: fakeSlip, autoVerifyDemo: false })
      ).rejects.toThrow("ถูกใช้งานในระบบไปแล้ว");

      // Admin approves slip -> order becomes PAID and stock is deducted cleanly
      const approved = await reviewOrderSlip(
        order.orderNo,
        { paymentId: firstSlip.payment.id, decision: "APPROVE", rejectReason: "" },
        "test-admin"
      );
      expect(approved.orderStatus).toBe("PAID");

      const kpAfterPaid = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
      expect(kpAfterPaid).toBe(kpBefore - 2);

      // Re-approving must NOT double-deduct stock (idempotent)
      await reviewOrderSlip(
        order.orderNo,
        { paymentId: firstSlip.payment.id, decision: "APPROVE", rejectReason: "" },
        "test-admin"
      );
      const kpStillSame = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
      expect(kpStillSame).toBe(kpBefore - 2);

      // Auto-cancelling an unpaid order must NOT inflate stock
      const unpaidOrder = await createOrder({
        items: [{ productId: setProd.id, quantity: 1 }],
        customerName: "ทดสอบ ไม่โอน",
        customerPhone: "0891112299",
        customerEmail: "",
        deliveryMethod: "FACTORY_PICKUP",
        postalCode: "",
        addressText: "",
        paymentMethod: "PROMPTPAY",
        couponCode: "",
        note: "",
        channel: "WEB",
      });
      try {
        await db.order.update({
          where: { id: unpaidOrder.id },
          data: { status: "PENDING_PAYMENT", expiresAt: new Date(Date.now() - 60_000) },
        });
        await cancelExpiredUnpaidOrders();
        const kpAfterUnpaidCancel = (
          await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })
        ).stockQty;
        expect(kpAfterUnpaidCancel).toBe(kpBefore - 2);
      } finally {
        await db.order.deleteMany({ where: { id: unpaidOrder.id } });
      }
    } finally {
      // Restore bundle child SKUs touched by order
      const setWithChildren = await db.product.findUniqueOrThrow({
        where: { id: setProd.id },
        include: { bundleComponents: true },
      });
      const latestOrder = await db.order.findUnique({ where: { id: order.id } });
      if (latestOrder?.stockDeducted) {
        for (const comp of setWithChildren.bundleComponents) {
          await db.product.update({
            where: { id: comp.childProductId },
            data: { stockQty: { increment: comp.quantity * 2 } },
          });
        }
      }
      await db.order.deleteMany({ where: { id: order.id } });
      await db.stockMovement.deleteMany({ where: { orderNo: order.orderNo } });
      await db.coupon.update({ where: { code: "BOSS50" }, data: { usedCount: 0 } });
    }
  });

  it("supports satang decimal retail orders, PromptPay 0932896292 QR decimals, and wholesale/bulk pricing", async () => {
    const cleanChicken = await db.product.findUniqueOrThrow({
      where: { slug: "easy-clean-chicken-p" },
    });
    const kp = await db.product.findUniqueOrThrow({
      where: { slug: "pork-chop-kp" },
    });

    // Retail satang quote: 3 packs of 36.25 = 108.75 + BKK 60 = 168.75
    const retailOrder = await createOrder({
      items: [{ productId: cleanChicken.id, quantity: 3 }],
      customerName: "ลูกค้าปลีก ทศนิยม",
      customerPhone: "0819998877",
      customerEmail: "",
      deliveryMethod: "COLD_CHAIN",
      postalCode: "10110",
      addressText: "99 ลาดพร้าว กทม.",
      paymentMethod: "PROMPTPAY",
      couponCode: "",
      note: "",
      channel: "WEB",
    });
    try {
      expect(retailOrder.subtotalBaht).toBe(108.75);
      expect(retailOrder.totalBaht).toBe(168.75);

      const payDetail = await getOrderPaymentDetail(retailOrder.orderNo);
      expect(payDetail?.promptpayId).toBe("0932896292");
      expect(payDetail?.promptpayName).toBe("วรัป เจริญโพธิ์");
      expect(payDetail?.qrDataUrl).toMatch(/^data:image\/png;base64,/);

      // Mixed 10 packs unlocks WHOLESALE automatically (6 * 29 + 4 * 52 = 382)
      const mixedQuote = await quoteCart({
        items: [
          { productId: cleanChicken.id, quantity: 6 },
          { productId: kp.id, quantity: 4 },
        ],
        deliveryMethod: "FACTORY_PICKUP",
        postalCode: "",
        paymentMethod: "PROMPTPAY",
        couponCode: "",
      });
      expect(mixedQuote.pricingTier).toBe("WHOLESALE");
      expect(mixedQuote.subtotalBaht).toBe(6 * 29 + 4 * 52);
    } finally {
      await db.order.deleteMany({ where: { id: retailOrder.id } });
      await db.stockMovement.deleteMany({ where: { orderNo: retailOrder.orderNo } });
    }
  });
});
