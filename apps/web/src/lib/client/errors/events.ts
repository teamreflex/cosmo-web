import { m } from "@/i18n/messages";
import { isEventErrorCode } from "@/lib/universal/errors/events";

/**
 * Maps an era/event error code to a localized message, or null when the code
 * is not a known era/event error code.
 */
export function formatEventError(code: string): string | null {
  if (!isEventErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "era_slug_taken":
      return m.admin_era_error_slug_taken();
    case "event_slug_taken":
      return m.admin_event_error_slug_taken();
    default:
      code satisfies never;
      return null;
  }
}
