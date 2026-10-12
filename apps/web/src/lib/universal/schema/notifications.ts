import * as z from "zod";

export const listNotificationsSchema = z.object({
  cursor: z.string().optional(),
});

/**
 * Mark everything read, or at least one notification by id.
 */
export const markNotificationsReadSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.uuid()).min(1) }),
]);

export type MarkNotificationsRead = z.infer<typeof markNotificationsReadSchema>;
