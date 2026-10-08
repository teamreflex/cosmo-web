import {
  reportReasons,
  reportStatuses,
  reportTargetTypes,
} from "@apollo/database/web/types";
import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .max(1000, "Note cannot be longer than 1000 characters")
  .optional()
  .transform((note) => (note === "" ? undefined : note));

/**
 * One variant per reportable target; later phases add messages, listings,
 * feedback and trades.
 */
export const createReportSchema = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("user"),
    targetId: z.string().min(1),
    reason: z.enum(reportReasons),
    note: noteSchema,
  }),
]);

export const reportTargetSchema = z.object({
  targetType: z.enum(reportTargetTypes),
  targetId: z.string().min(1),
});

export const reportQueueFiltersSchema = z.object({
  status: z.enum(reportStatuses),
  targetType: z.enum(reportTargetTypes).optional(),
});

export const reportQueueSchema = reportQueueFiltersSchema.extend({
  cursor: z.string().optional(),
});

export const reportIdSchema = z.object({
  id: z.uuid(),
});

export type CreateReport = z.infer<typeof createReportSchema>;
export type ReportTarget = z.infer<typeof reportTargetSchema>;
export type ReportQueueFilters = z.infer<typeof reportQueueFiltersSchema>;
export type ReportQueueInput = z.infer<typeof reportQueueSchema>;
