import { z } from "zod";

const costBahtSchema = z
  .number()
  .min(0, "ราคาทุนต้องไม่ติดลบ")
  .max(1_000_000)
  .transform((n) => Math.round(n * 100) / 100);

const optionalPoNoSchema = z.preprocess(
  (val) => {
    if (typeof val !== "string") return undefined;
    const trimmed = val.trim().toUpperCase();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z
    .string()
    .min(3, "เลขที่ PO สั้นเกินไป")
    .max(40, "เลขที่ PO ยาวเกินไป")
    .regex(/^[A-Z0-9-]+$/, "เลขที่ PO ใช้ได้เฉพาะ A-Z, 0-9 และ -")
    .optional()
);

const expectedDateSchema = z
  .string()
  .trim()
  .min(1, "กรุณาระบุกำหนดส่ง")
  .refine((val) => !Number.isNaN(Date.parse(val)), "รูปแบบวันที่กำหนดส่งไม่ถูกต้อง")
  .transform((val) => new Date(val));

export const poItemInputSchema = z.object({
  productId: z.string().min(1, "กรุณาเลือกสินค้า"),
  orderedQty: z.number().int().min(1, "จำนวนสั่งต้องอย่างน้อย 1").max(100_000),
  unitCostBaht: costBahtSchema,
});

const uniquePoItemsSchema = z
  .array(poItemInputSchema)
  .min(1, "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ")
  .max(200)
  .refine(
    (items) => new Set(items.map((i) => i.productId)).size === items.length,
    "ห้ามใส่สินค้า SKU ซ้ำกันในใบ PO เดียวกัน"
  );

export const createPurchaseOrderSchema = z.object({
  poNo: optionalPoNoSchema,
  supplierName: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อผู้ขายหรือโรงงาน")
    .max(120)
    .default("โรงงานอ่างทอง"),
  expectedDate: expectedDateSchema,
  note: z.string().trim().max(500).default(""),
  items: uniquePoItemsSchema,
});

export const updatePurchaseOrderSchema = z.object({
  supplierName: z.string().trim().min(1, "กรุณาระบุชื่อผู้ขายหรือโรงงาน").max(120),
  expectedDate: expectedDateSchema,
  note: z.string().trim().max(500).default(""),
  items: uniquePoItemsSchema,
});

export const patchPurchaseOrderSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE"),
    supplierName: z.string().trim().min(1, "กรุณาระบุชื่อผู้ขายหรือโรงงาน").max(120),
    expectedDate: expectedDateSchema,
    note: z.string().trim().max(500).default(""),
    items: uniquePoItemsSchema,
  }),
  z.object({
    action: z.literal("SHORT_CLOSE"),
    reason: z.string().trim().max(300).optional().default(""),
  }),
  z.object({
    action: z.literal("CANCEL"),
    reason: z.string().trim().max(300).optional().default(""),
  }),
]);

export const receiptLineInputSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  receivedQty: z.number().int().min(1, "จำนวนรับต้องอย่างน้อย 1").max(100_000),
});

export const createGoodsReceiptSchema = z.object({
  deliveryNoteNo: z.string().trim().max(80).default(""),
  note: z.string().trim().max(500).default(""),
  items: z
    .array(receiptLineInputSchema)
    .min(1, "กรุณาระบุจำนวนสินค้าที่รับอย่างน้อย 1 รายการ")
    .max(200)
    .refine(
      (items) => new Set(items.map((i) => i.purchaseOrderItemId)).size === items.length,
      "พบรายการซ้ำในการบันทึกรับสินค้า"
    ),
});

export const voidGoodsReceiptSchema = z.object({
  reason: z.string().trim().min(2, "กรุณาระบุเหตุผลการยกเลิกใบรับ").max(300),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PatchPurchaseOrderInput = z.infer<typeof patchPurchaseOrderSchema>;
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
export type VoidGoodsReceiptInput = z.infer<typeof voidGoodsReceiptSchema>;
