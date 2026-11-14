import { m } from "@/i18n/messages";
import { isReportErrorCode } from "@/lib/universal/errors/reports";

/**
 * Maps a report error code to a localized message, or null when the code is
 * not a known report error code.
 */
export function formatReportError(code: string): string | null {
  if (!isReportErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "report_already_open":
      return m.report_error_report_already_open();
    case "report_self":
      return m.report_error_report_self();
    case "report_target_not_found":
      return m.report_error_report_target_not_found();
    case "report_not_found":
      return m.report_error_report_not_found();
    case "report_about_you":
      return m.report_error_report_about_you();
    case "report_status_changed":
      return m.report_error_report_status_changed();
    case "report_trade_dispute":
      return m.report_error_report_trade_dispute();
    default:
      code satisfies never;
      return null;
  }
}
