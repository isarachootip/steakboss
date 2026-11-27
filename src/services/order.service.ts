import { db } from "@/lib/db";
import { expandStockDeductions } from "@/domain/inventory";
import { generateOrderNo, normalizePhone, type OrderStatus } from "@/domain/order";
import { notifyOrderStatus } from "./order-lifecycle.service";
import { quoteCart } from "./quote.service";
import type { z } from "zod";
import type { checkoutRequestSchema } from "@/schemas/order.schema";

export { quoteCart } from "./quote.service";
export { lookupOrderForTracking, updateOrderByAdmin } from "./order-admin.service";

export async function createOrder(
  input: z.infer<typeof checkoutRequestSchema>,
  userId?: string,
  userRole?: string
) {
  const phone = normalizePhone(input.customerPhone);
  if (phone.length < 9) throw new Error("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
  if (input.deliveryMethod === "COLD_CHAIN" && !input.addressText.trim()) {
    throw new Error("กรุณากรอกที่อยู่สำหรับจัดส่งรถเย็น");
  }

  let effectiveRole = userRole;
  if (!effectiveRole && userId) {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    effectiveRole = u?.role;
  }

  const quoted = await quoteCart(input, {
    isWholesaleRole: effectiveRole === "WHOLESALE",
  });
  if (quoted.shippingBaht === null || quoted.totalBaht === null || !quoted.zone) {
    throw new Error("กรุณากรอกรหัสไปรษณีย์ 5 หลักให้ถูกต้อง");
  }
  if (input.couponCode.trim() && !quoted.couponApplied) {
    throw new Error(quoted.couponError || "โค้ดส่วนลดไม่สามารถใช้งานได้");
  }

  const deductions = expandStockDeductions(
    quoted.resolvedLines.map((l) => ({
      quantity: l.quantity,
      product: {
        id: l.product.id,
        isBundle: l.product.isBundle,
        isActive: l.product.isActive,
        stockQty: l.product.stockQty,
        components: l.product.bundleComponents.map((b) => ({
          childProductId: b.childProductId,
          quantity: b.quantity,
          childStockQty: b.child.stockQty,
          childPriceBaht: b.child.priceBaht,
          childIsActive: b.child.isActive,
        })),
      },
    }))
  );

  const orderNo = generateOrderNo();
  const initialStatus: OrderStatus =
    input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";
  const expiresAt =
    initialStatus === "PENDING_PAYMENT"
      ? new Date(Date.now() + quoted.settings.unpaidExpireHours * 3600_000)
      : null;

  const order = await db.$transaction(async (tx) => {
    for (const d of deductions) {
      const updated = await tx.product.updateMany({
        where: { id: d.productId, stockQty: { gte: d.quantity } },
        data: { stockQty: { decrement: d.quantity } },
      });
      if (updated.count === 0) {
        const p = await tx.product.findUnique({ where: { id: d.productId } });
        throw new Error(`สินค้า "${p?.name ?? d.productId}" สต็อกไม่เพียงพอ`);
      }
      await tx.stockMovement.create({
        data: {
          productId: d.productId,
          deltaQty: -d.quantity,
          type: "RESERVE",
          reason: `สั่งซื้อ ${orderNo}`,
          orderNo,
          actorId: userId ?? null,
        },
      });
    }

    if (quoted.couponApplied) {
      await tx.coupon.update({
        where: { code: quoted.couponApplied },
        data: { usedCount: { increment: 1 } },
      });
    }

    return tx.order.create({
      data: {
        orderNo,
        userId: userId ?? null,
        channel: input.channel,
        status: initialStatus,
        pricingTier: quoted.pricingTier,
        customerName: input.customerName,
        customerPhone: phone,
        customerEmail: input.customerEmail || "",
        deliveryMethod: input.deliveryMethod,
        shippingZone: quoted.zone!,
        postalCode: input.deliveryMethod === "FACTORY_PICKUP" ? "" : input.postalCode,
        addressText: input.deliveryMethod === "FACTORY_PICKUP" ? "" : input.addressText,
        note: input.note,
        subtotalBaht: quoted.subtotalBaht,
        discountBaht: quoted.discountBaht,
        shippingBaht: quoted.shippingBaht!,
        codFeeBaht: quoted.codFeeBaht,
        totalBaht: quoted.totalBaht!,
        couponCode: quoted.couponApplied,
        paymentMethod: input.paymentMethod,
        expiresAt,
        items: {
          create: quoted.resolvedLines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            appliedTier: l.appliedTier,
            unitPriceBaht: l.unitPriceBaht,
            unitCostBaht: l.product.costBaht,
            quantity: l.quantity,
            lineTotalBaht: l.lineTotal,
          })),
        },
        events: {
          create: {
            status: initialStatus,
            note:
              input.paymentMethod === "COD"
                ? "สร้างออเดอร์เก็บเงินปลายทาง"
                : "รอโอนชำระพร้อมเพย์",
            actorId: userId ?? null,
          },
        },
      },
      include: { items: true, events: true },
    });
  });

  await notifyOrderStatus(order.orderNo, order.status as OrderStatus);
  return order;
}
