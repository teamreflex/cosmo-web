import { m } from "@/i18n/messages";
import { isSerialErrorCode } from "@/lib/universal/errors/serials";

/**
 * Maps a serial confirmation error code to a localized message, or null when
 * the code is not a known serial confirmation error code.
 */
export function formatSerialError(code: string): string | null {
  if (!isSerialErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "objekt_not_found":
      return m.admin_serials_error_objekt_not_found();
    case "serial_confirmation_not_found":
      return m.admin_serials_error_confirmation_not_found();
    default:
      code satisfies never;
      return null;
  }
}
