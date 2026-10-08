import { m } from "@/i18n/messages";
import type { ReportReason } from "@apollo/database/web/types";

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
