import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createOrder, lookupOrderForTracking, quoteCart } from "@/services/order.service";
import { cancelExpiredUnpaidOrders } from "@/services/order-lifecycle.service";
import { getOrderPaymentDetail, submitOrderSlip } from "@/services/payment.service";

describe("order, multi-tier pricing & payment integration", () => {
  it("deducts bundle child SKUs, blocks duplicate slip, and restores stock on auto-cancel", async () => {
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

    expect(order.pricingTier).toBe("RETAIL");
    expect(order.subtotalBaht).toBe(358);
    expect(order.discountBaht).toBe(50);
    expect(order.shippingBaht).toBe(60);
    expect(order.totalBaht).toBe(368);

    const kpAfterOrder = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
    expect(kpAfterOrder).toBe(kpBefore - 2);

    const tracked = await lookupOrderForTracking(order.orderNo, "2233");
    expect(tracked.ok).toBe(true);
    const badTrack = await lookupOrderForTracking(order.orderNo, "9999");
    expect(badTrack.ok).toBe(false);

    const fakeSlip = `data:image/png;base64,TESTSLIP-${order.orderNo}-UNIQUE`;
    const firstSlip = await submitOrderSlip(order.orderNo, {
      slipBase64: fakeSlip,
      autoVerifyDemo: false,
    });
    expect(firstSlip.orderStatus).toBe("SLIP_SUBMITTED");

    await expect(
      submitOrderSlip(order.orderNo, { slipBase64: fakeSlip, autoVerifyDemo: false })
    ).rejects.toThrow("ถูกใช้งานในระบบไปแล้ว");

    await db.order.update({
      where: { id: order.id },
      data: { status: "PENDING_PAYMENT", expiresAt: new Date(Date.now() - 60_000) },
    });
    const cancelled = await cancelExpiredUnpaidOrders();
    expect(cancelled).toBeGreaterThanOrEqual(1);

    const kpRestored = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
    expect(kpRestored).toBe(kpBefore);

    await db.order.delete({ where: { id: order.id } });
    await db.stockMovement.deleteMany({ where: { orderNo: order.orderNo } });
    await db.coupon.update({ where: { code: "BOSS50" }, data: { usedCount: 0 } });
  });

  it("supports satang decimal retail orders, PromptPay QR decimals, and wholesale/bulk pricing", async () => {
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
    expect(retailOrder.subtotalBaht).toBe(108.75);
    expect(retailOrder.totalBaht).toBe(168.75);

    const payDetail = await getOrderPaymentDetail(retailOrder.orderNo);
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

    // Cleanup retailOrder by restoring stock
    await db.product.update({
      where: { id: cleanChicken.id },
      data: { stockQty: { increment: 3 } },
    });
    await db.order.delete({ where: { id: retailOrder.id } });
    await db.stockMovement.deleteMany({ where: { orderNo: retailOrder.orderNo } });
  });
});
