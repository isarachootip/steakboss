import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  updateCustomerProfile,
  upsertCustomerFromLineProfile,
} from "@/services/line-login.service";
import {
  createOrder,
  lookupOrderForAuthenticatedUser,
} from "@/services/order.service";

describe("LINE Login customer profile & order linking service", () => {
  it("upserts LINE customer, saves default address, links prior guest orders by phone, and allows authenticated tracking", async () => {
    const stamp = Date.now();
    const testPhone = `09${String(stamp).slice(-8)}`;
    const lineId = `U_TEST_${stamp}`;
    const kp = await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } });
    let guestOrderId = "";
    let lineUserIdDb = "";

    try {
      // 1. Prior guest order with testPhone
      const guestOrder = await createOrder({
        items: [{ productId: kp.id, quantity: 1 }],
        customerName: "ลูกค้าเดิม",
        customerPhone: testPhone,
        customerEmail: "",
        deliveryMethod: "COLD_CHAIN",
        postalCode: "10110",
        addressText: "11 สุขุมวิท กทม.",
        paymentMethod: "PROMPTPAY",
        couponCode: "",
        note: "",
        channel: "WEB",
      });
      guestOrderId = guestOrder.id;
      expect(guestOrder.userId).toBeNull();

      // 2. Customer signs in via LINE Login
      const lineUser = await upsertCustomerFromLineProfile({
        userId: lineId,
        displayName: "คุณทดสอบ ไลน์",
        pictureUrl: "https://example.com/pic.jpg",
      });
      lineUserIdDb = lineUser.id;
      expect(lineUser.lineUserId).toBe(lineId);
      expect(lineUser.linePictureUrl).toBe("https://example.com/pic.jpg");

      // 3. Customer saves phone + default address -> links prior guest order automatically
      const updated = await updateCustomerProfile(lineUser.id, {
        name: "คุณทดสอบ ไลน์",
        phone: testPhone,
        email: "",
        addressLine: "99/9 อโศก กทม.",
        postalCode: "10110",
      });
      expect(updated.linkedOrdersCount).toBe(1);
      expect(updated.user.addresses).toHaveLength(1);
      expect(updated.user.addresses[0]?.addressLine).toBe("99/9 อโศก กทม.");

      // 4. Authenticated tracking works directly without 4-digit phone lookup
      const tracked = await lookupOrderForAuthenticatedUser(
        guestOrder.orderNo,
        lineUser.id
      );
      expect(tracked.ok).toBe(true);
    } finally {
      if (guestOrderId) {
        await db.order.deleteMany({ where: { id: guestOrderId } });
      }
      if (lineUserIdDb) {
        await db.user.deleteMany({ where: { id: lineUserIdDb } });
      }
    }
  });
});
