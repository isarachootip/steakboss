import { z } from "zod";

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
});

export const quoteRequestSchema = z.object({
  items: z.array(cartLineSchema).min(1),
  deliveryMethod: z.enum(["COLD_CHAIN", "FACTORY_PICKUP"]),
  postalCode: z.string().trim().max(10).optional().default(""),
  paymentMethod: z.enum(["PROMPTPAY", "COD"]),
  couponCode: z.string().trim().max(32).optional().default(""),
});

export const checkoutRequestSchema = quoteRequestSchema.extend({
  customerName: z.string().trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(100),
  customerPhone: z.string().trim().min(9, "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง").max(20),
  customerEmail: z.string().trim().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  addressText: z.string().trim().max(400).optional().default(""),
  note: z.string().trim().max(300).optional().default(""),
  channel: z.enum(["WEB", "LINE"]).optional().default("WEB"),
});

export const submitSlipSchema = z.object({
  slipBase64: z.string().min(20, "กรุณาแนบรูปสลิปการโอนเงิน").max(8_000_000),
  transRef: z.string().trim().max(120).optional(),
  autoVerifyDemo: z.boolean().optional().default(false),
});

export const trackQuerySchema = z.object({
  orderNo: z.string().trim().min(4, "กรุณากรอกเลขคำสั่งซื้อ"),
  phoneLast4: z.string().trim().regex(/^\d{4}$/, "กรุณากรอกเบอร์โทร 4 ตัวท้าย"),
});

export const adminUpdateOrderSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "SLIP_SUBMITTED",
    "CONFIRMED",
    "PAID",
    "PACKING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  carrier: z.string().trim().max(80).optional(),
  trackingNo: z.string().trim().max(80).optional(),
  codSettled: z.boolean().optional(),
  note: z.string().trim().max(240).optional(),
});

export const reviewSlipSchema = z.object({
  paymentId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectReason: z.string().trim().max(200).optional().default(""),
});

export const bulkTrackingSchema = z.object({
  rows: z
    .array(
      z.object({
        orderNo: z.string().trim().min(4),
        carrier: z.string().trim().min(1).max(80),
        trackingNo: z.string().trim().min(1).max(80),
      })
    )
    .min(1)
    .max(500),
});
