import { z } from "zod";

export const staffLoginSchema = z.object({
  mode: z.literal("staff", {
    errorMap: () => ({
      message: "ลูกค้ากรุณาเข้าสู่ระบบด้วย LINE Login ส่วนพนักงานใช้อีเมลและรหัสผ่าน",
    }),
  }),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(4, "กรุณากรอกรหัสผ่าน"),
});

export const loginRequestSchema = staffLoginSchema;
