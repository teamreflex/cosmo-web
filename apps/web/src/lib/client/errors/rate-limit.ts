import { m } from "@/i18n/messages";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";

/**
 * Maps a rate limit error code to a localized message, or null when the error
 * is not a known rate limit error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatRateLimitError(error: unknown): string | null {
  if (!(error instanceof Error) || !isRateLimitErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "rate_limited":
      return m.error_rate_limited();
    default:
      error.message satisfies never;
      return null;
  }
}
