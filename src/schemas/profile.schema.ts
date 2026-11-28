import { z } from "zod";

export const updateCustomerProfileSchema = z.object({
  name: z.string().trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(100),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || v.replace(/\D/g, "").length >= 9,
      "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (9-10 หลัก)"
    )
    .optional()
    .default(""),
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  addressLine: z.string().trim().max(400).optional().default(""),
  postalCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}$/.test(v), "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก")
    .optional()
    .default(""),
});

export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
