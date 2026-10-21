import { m } from "@/i18n/messages";
import {
  banLengthOptions,
  reportTargetTypeFilters,
} from "@/lib/universal/reports";
import {
  feedbackReportReasons,
  reportReasons,
  reportStatuses,
} from "@apollo/database/web/types";
import * as z from "zod";

export const reportNoteSchema = z
  .string()
  .trim()
  .max(1000, "Note cannot be longer than 1000 characters")
  .optional()
  .transform((note) => (note === "" ? undefined : note));

/**
 * One variant per target reported through the web app, each with its own
 * reasons. Chat reports its messages itself, and trades are reported by
 * opening a dispute.
 */
export const createReportSchema = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("user"),
    targetId: z.string().min(1),
    reason: z.enum(reportReasons),
    note: reportNoteSchema,
  }),
  z.object({
    targetType: z.literal("feedback"),
    targetId: z.uuid(),
    reason: z.enum(feedbackReportReasons),
    note: reportNoteSchema,
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
    .min(1, { error: () => m.admin_ban_reason_required() })
    .max(500, "Reason cannot be longer than 500 characters"),
  length: z.literal(banLengthOptions.map((option) => option.value)),
});

export type BanUser = z.infer<typeof banUserSchema>;
