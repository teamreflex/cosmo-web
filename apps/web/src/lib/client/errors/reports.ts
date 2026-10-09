import { m } from "@/i18n/messages";
import { isReportErrorCode } from "@/lib/universal/errors/reports";

/**
 * Maps a report error code to a localized message, or null when the error is
 * not a known report error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatReportError(error: unknown): string | null {
  if (!(error instanceof Error) || !isReportErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
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
    default:
      error.message satisfies never;
      return null;
  }
}
