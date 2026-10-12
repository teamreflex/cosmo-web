import { m } from "@/i18n/messages";
import { isSerialErrorCode } from "@/lib/universal/errors/serials";

/**
 * Maps a serial confirmation error code to a localized message, or null when
 * the error is not a known serial confirmation error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatSerialError(error: unknown): string | null {
  if (!(error instanceof Error) || !isSerialErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "objekt_not_found":
      return m.admin_serials_error_objekt_not_found();
    case "serial_confirmation_not_found":
      return m.admin_serials_error_confirmation_not_found();
    default:
      error.message satisfies never;
      return null;
  }
}
