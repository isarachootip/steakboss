import { z } from "zod";

export const staffRoleSchema = z.enum(["OWNER", "ADMIN", "PACKER"]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

const optionalPhoneSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9]/g, "");
      return cleaned.length === 0 ? null : cleaned;
    }
    return val;
  }, z.string().min(9, "เบอร์โทรต้องมีอย่างน้อย 9 หลัก").max(15).nullable())
  .default(null);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2, "กรุณาระบุชื่อพนักงานอย่างน้อย 2 ตัวอักษร").max(100),
  email: z
    .string()
    .trim()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .max(160)
    .transform((v) => v.toLowerCase()),
  phone: optionalPhoneSchema,
  role: staffRoleSchema,
  password: z
    .string()
    .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    .max(100),
  isActive: z.boolean().default(true),
});

export const updateStaffSchema = z.object({
  name: z.string().trim().min(2, "กรุณาระบุชื่อพนักงานอย่างน้อย 2 ตัวอักษร").max(100).optional(),
  email: z
    .string()
    .trim()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .max(160)
    .transform((v) => v.toLowerCase())
    .optional(),
  phone: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === "string") {
        const cleaned = val.replace(/[^0-9]/g, "");
        return cleaned.length === 0 ? null : cleaned;
      }
      return val;
    }, z.string().min(9, "เบอร์โทรต้องมีอย่างน้อย 9 หลัก").max(15).nullable().optional()),
  role: staffRoleSchema.optional(),
  password: z
    .preprocess(
      (val) => (typeof val === "string" && val.trim().length === 0 ? undefined : val),
      z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร").max(100).optional()
    ),
  isActive: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export interface StaffMemberDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
