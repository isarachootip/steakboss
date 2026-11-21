import { z } from "zod";

export const staffLoginSchema = z.object({
  mode: z.literal("staff"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(4, "กรุณากรอกรหัสผ่าน"),
});

export const customerLoginSchema = z.object({
  mode: z.literal("customer"),
  phone: z.string().min(9, "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  lineUserId: z.string().max(120).optional(),
});

export const loginRequestSchema = z.discriminatedUnion("mode", [
  staffLoginSchema,
  customerLoginSchema,
]);
