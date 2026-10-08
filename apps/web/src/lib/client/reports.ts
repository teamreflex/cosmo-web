import { m } from "@/i18n/messages";
import type { AdminReportRowTarget, BanLength } from "@/lib/universal/reports";
import type { ReportReason, ReportStatus } from "@apollo/database/web/types";

const reasonLabels = {
  scam: m.report_reason_scam,
  harassment: m.report_reason_harassment,
  impersonation: m.report_reason_impersonation,
  spam: m.report_reason_spam,
  other: m.report_reason_other,
} satisfies Record<ReportReason, () => string>;

/**
 * Maps a report reason to its localized label.
 */
export function reportReasonLabel(reason: ReportReason): string {
  return reasonLabels[reason]();
}

const statusLabels = {
  open: m.admin_reports_status_open,
  escalated: m.admin_reports_status_escalated,
  resolved: m.admin_reports_status_resolved,
  dismissed: m.admin_reports_status_dismissed,
} satisfies Record<ReportStatus, () => string>;

/**
 * Maps a report status to its localized label.
 */
export function reportStatusLabel(status: ReportStatus): string {
  return statusLabels[status]();
}

type QueueTargetType = AdminReportRowTarget["type"];

const targetTypeLabels = {
  user: m.admin_reports_type_user,
} satisfies Record<QueueTargetType, () => string>;

/**
 * The target types the queue's Type filter offers; later phases add theirs
 * as their reports arrive.
 */
export const reportTargetTypeFilters = [
  "user",
] as const satisfies readonly QueueTargetType[];

/**
 * Maps a reportable target type to its localized label.
 */
export function reportTargetTypeLabel(type: QueueTargetType): string {
  return targetTypeLabels[type]();
}

const banLengthLabels = {
  "7d": m.admin_ban_length_7d,
  "30d": m.admin_ban_length_30d,
  permanent: m.admin_ban_length_permanent,
} satisfies Record<BanLength, () => string>;

/**
 * Maps a ban length to its localized label.
 */
export function banLengthLabel(length: BanLength): string {
  return banLengthLabels[length]();
}
