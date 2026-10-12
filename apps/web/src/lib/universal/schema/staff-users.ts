import * as z from "zod";
import { banUserSchema } from "./reports";

/**
 * `expiresIn` is the ban length in seconds, null for a permanent ban. A ban
 * started from a report carries the report's id.
 */
export const banUserInputSchema = banUserSchema.pick({ reason: true }).extend({
  userId: z.string().min(1),
  expiresIn: z.number().int().positive().nullable(),
  reportId: z.uuid().optional(),
});

export const unbanUserInputSchema = z.object({
  userId: z.string().min(1),
});

export type BanUserInput = z.infer<typeof banUserInputSchema>;
export type UnbanUserInput = z.infer<typeof unbanUserInputSchema>;
