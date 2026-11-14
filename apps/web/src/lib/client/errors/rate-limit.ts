import { m } from "@/i18n/messages";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";

/**
 * Maps a rate limit error code to a localized message, or null when the code
 * is not a known rate limit error code.
 */
export function formatRateLimitError(code: string): string | null {
  if (!isRateLimitErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "rate_limited":
      return m.error_rate_limited();
    default:
      code satisfies never;
      return null;
  }
}
