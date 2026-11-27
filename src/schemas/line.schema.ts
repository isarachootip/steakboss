import { z } from "zod";

export const lineBotInfoSchema = z.object({
  userId: z.string(),
  basicId: z.string().optional(),
  premiumId: z.string().optional(),
  displayName: z.string(),
  pictureUrl: z.string().optional(),
  chatMode: z.string().optional(),
});

export type LineBotInfo = z.infer<typeof lineBotInfoSchema>;

export const lineUserProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  pictureUrl: z.string().optional(),
  statusMessage: z.string().optional(),
});

export type LineUserProfile = z.infer<typeof lineUserProfileSchema>;

export const lineAdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("test_push"),
    to: z.string().trim().min(5).max(80).optional(),
  }),
  z.object({
    action: z.literal("sync_store_line"),
  }),
]);

export type LineAdminActionInput = z.infer<typeof lineAdminActionSchema>;
