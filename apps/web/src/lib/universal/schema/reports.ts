import {
  banLengthOptions,
  reportTargetTypeFilters,
} from "@/lib/universal/reports";
import { reportReasons, reportStatuses } from "@apollo/database/web/types";
import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .max(1000, "Note cannot be longer than 1000 characters")
  .optional()
  .transform((note) => (note === "" ? undefined : note));

/**
 * One variant per reportable target; later phases add messages, feedback
 * and trades.
 */
export const createReportSchema = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("user"),
    targetId: z.string().min(1),
    reason: z.enum(reportReasons),
    note: noteSchema,
  }),
]);

export const reportQueueFiltersSchema = z.object({
  status: z.enum(reportStatuses),
  targetType: z.enum(reportTargetTypeFilters).optional(),
});

export const reportCountsSchema = reportQueueFiltersSchema.pick({
  targetType: true,
});

export const reportQueueSchema = reportQueueFiltersSchema.extend({
  // the previous page's last report
  cursor: z.uuid().optional(),
});

export const reportIdSchema = z.object({
  id: z.uuid(),
});

export type CreateReport = z.infer<typeof createReportSchema>;
export type ReportQueueFilters = z.infer<typeof reportQueueFiltersSchema>;
export type ReportCountsInput = z.infer<typeof reportCountsSchema>;
export type ReportQueueInput = z.infer<typeof reportQueueSchema>;

/**
 * The Ban dialog's form; its length maps to `banExpiresIn` through
 * `banLengthOptions`.
 */
export const banUserSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason for the ban")
    .max(500, "Reason cannot be longer than 500 characters"),
  length: z.literal(banLengthOptions.map((option) => option.value)),
});

export type BanUser = z.infer<typeof banUserSchema>;
