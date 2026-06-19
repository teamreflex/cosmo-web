import { m } from "@/i18n/messages";
import { isGravityErrorCode } from "@/lib/universal/errors/gravity";

/**
 * Maps a gravity error code to a localized message, or null when the error is
 * not a known gravity error code.
 */
export function formatGravityError(error: unknown): string | null {
  if (!(error instanceof Error) || !isGravityErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "combination_poll_unsupported":
      return m.gravity_combination_not_supported();
    default:
      error.message satisfies never;
      return null;
  }
}
