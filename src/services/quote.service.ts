import { db } from "@/lib/db";
import { evaluateCoupon, type CouponType } from "@/domain/pricing";
import { calculateShippingQuote } from "@/domain/shipping";
import { getStoreSettings } from "./settings.service";
import type { z } from "zod";
import type { quoteRequestSchema } from "@/schemas/order.schema";

export async function loadProductsForCart(productIds: string[]) {
  return db.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: {
      bundleComponents: {
        include: {
          child: {
            select: {
              id: true,
              name: true,
              priceBaht: true,
              stockQty: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
}

export async function quoteCart(input: z.infer<typeof quoteRequestSchema>) {
  const [products, settings] = await Promise.all([
    loadProductsForCart(input.items.map((i) => i.productId)),
    getStoreSettings(),
  ]);
  const prodMap = new Map(products.map((p) => [p.id, p]));

  let subtotalBaht = 0;
  const resolvedLines = input.items.map((line) => {
    const product = prodMap.get(line.productId);
    if (!product) throw new Error("มีสินค้าบางรายการไม่พร้อมจำหน่าย");
    const lineTotal = product.priceBaht * line.quantity;
    subtotalBaht += lineTotal;
    return { product, quantity: line.quantity, lineTotal };
  });

  let couponResult: {
    valid: boolean;
    discountBaht: number;
    freeShipping: boolean;
    reason?: string;
    code?: string;
  } = { valid: false, discountBaht: 0, freeShipping: false };

  if (input.couponCode.trim()) {
    const code = input.couponCode.trim().toUpperCase();
    const coupon = await db.coupon.findUnique({ where: { code } });
    const evaluated = evaluateCoupon(
      coupon ? { ...coupon, type: coupon.type as CouponType } : null,
      subtotalBaht
    );
    couponResult = { ...evaluated, code: evaluated.valid ? code : undefined };
  }

  const shipping = calculateShippingQuote({
    subtotalBaht,
    discountBaht: couponResult.discountBaht,
    freeShippingByCoupon: couponResult.freeShipping,
    deliveryMethod: input.deliveryMethod,
    postalCode: input.postalCode,
    paymentMethod: input.paymentMethod,
    rates: settings,
  });

  return {
    resolvedLines,
    subtotalBaht,
    discountBaht: couponResult.discountBaht,
    couponApplied: couponResult.valid ? couponResult.code ?? null : null,
    couponError:
      input.couponCode.trim() && !couponResult.valid
        ? couponResult.reason
        : undefined,
    ...shipping,
    settings,
  };
}
