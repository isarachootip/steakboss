import { z } from "zod";

export const updateSettingsSchema = z.object({
  bkkShipBaht: z.number().int().min(0).max(5000),
  upcShipBaht: z.number().int().min(0).max(5000),
  freeShipThreshold: z.number().int().min(0).max(100000),
  codFeeBaht: z.number().int().min(0).max(1000),
  phone: z.string().trim().max(40),
  lineId: z.string().trim().max(60),
  lineOaUrl: z.string().trim().max(240),
  promptpayId: z.string().trim().max(30),
  promptpayName: z.string().trim().max(120),
  facebookPage: z.string().trim().max(120),
  unpaidExpireHours: z.number().int().min(1).max(168),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
