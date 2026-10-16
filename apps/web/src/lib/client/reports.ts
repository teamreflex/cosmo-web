import { m } from "@/i18n/messages";
import type { AdminReportRowTarget, BanLength } from "@/lib/universal/reports";
import type {
  ReportStatus,
  StoredReportReason,
} from "@apollo/database/web/types";

const reasonLabels = {
  scam: m.report_reason_scam,
  harassment: m.report_reason_harassment,
  impersonation: m.report_reason_impersonation,
  spam: m.report_reason_spam,
  other: m.report_reason_other,
  not_responding: m.report_reason_not_responding,
  objekt_not_received: m.report_reason_objekt_not_received,
  payment_not_received: m.report_reason_payment_not_received,
  off_terms: m.report_reason_off_terms,
  off_platform_payment: m.report_reason_off_platform_payment,
  party_banned: m.report_reason_party_banned,
  retaliation: m.report_reason_retaliation,
  personal_info: m.report_reason_personal_info,
} satisfies Record<StoredReportReason, () => string>;

/**
 * Maps a report reason, a dispute's included, to its localized label.
 */
export function reportReasonLabel(reason: StoredReportReason): string {
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
  trade: m.admin_reports_type_trade,
  message: m.admin_reports_type_message,
  feedback: m.admin_reports_type_feedback,
} satisfies Record<QueueTargetType, () => string>;

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
