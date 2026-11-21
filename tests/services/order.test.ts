import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createOrder, lookupOrderForTracking } from "@/services/order.service";
import { cancelExpiredUnpaidOrders } from "@/services/order-lifecycle.service";
import { submitOrderSlip } from "@/services/payment.service";

describe("order & payment integration", () => {
  it("deducts bundle child SKUs, blocks duplicate slip, and restores stock on auto-cancel", async () => {
    const setProd = await db.product.findUniqueOrThrow({ where: { slug: "best-seller-set-4" } });
    const kpBefore = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;

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

    expect(order.subtotalBaht).toBe(518);
    expect(order.discountBaht).toBe(50);
    expect(order.shippingBaht).toBe(60);
    expect(order.totalBaht).toBe(528);

    const kpAfterOrder = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
    expect(kpAfterOrder).toBe(kpBefore - 2);

    // Tracking check
    const tracked = await lookupOrderForTracking(order.orderNo, "2233");
    expect(tracked.ok).toBe(true);
    const badTrack = await lookupOrderForTracking(order.orderNo, "9999");
    expect(badTrack.ok).toBe(false);

    // Slip submit & duplicate rejection
    const fakeSlip = `data:image/png;base64,TESTSLIP-${order.orderNo}-UNIQUE`;
    const firstSlip = await submitOrderSlip(order.orderNo, {
      slipBase64: fakeSlip,
      autoVerifyDemo: false,
    });
    expect(firstSlip.orderStatus).toBe("SLIP_SUBMITTED");

    await expect(
      submitOrderSlip(order.orderNo, { slipBase64: fakeSlip, autoVerifyDemo: false })
    ).rejects.toThrow("ถูกใช้งานในระบบไปแล้ว");

    // Force back to PENDING_PAYMENT & expired to verify auto-cancel restores stock
    await db.order.update({
      where: { id: order.id },
      data: { status: "PENDING_PAYMENT", expiresAt: new Date(Date.now() - 60_000) },
    });
    const cancelled = await cancelExpiredUnpaidOrders();
    expect(cancelled).toBeGreaterThanOrEqual(1);

    const kpRestored = (await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } })).stockQty;
    expect(kpRestored).toBe(kpBefore);

    // Cleanup test records
    await db.order.delete({ where: { id: order.id } });
    await db.stockMovement.deleteMany({ where: { orderNo: order.orderNo } });
    await db.coupon.update({ where: { code: "BOSS50" }, data: { usedCount: 0 } });
  });
});
