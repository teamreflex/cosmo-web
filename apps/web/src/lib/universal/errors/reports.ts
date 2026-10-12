export const reportErrorCodes = [
  "report_already_open",
  "report_self",
  "report_target_not_found",
  "report_not_found",
  "report_about_you",
  "report_status_changed",
] as const;

export type ReportErrorCode = (typeof reportErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known report error code.
 */
export function isReportErrorCode(value: string): value is ReportErrorCode {
  return reportErrorCodes.some((code) => code === value);
}
