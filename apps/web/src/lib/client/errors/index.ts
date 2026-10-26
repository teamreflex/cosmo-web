import { formatAccountError } from "./accounts";
import { formatAuthError } from "./auth";
import { formatBinderError } from "./binders";
import { formatCollectionError } from "./collections";
import { formatFeedbackError } from "./feedback";
import { type Context, formatListError } from "./lists";
import { formatRateLimitError } from "./rate-limit";
import { formatReportError } from "./reports";
import { formatSerialError } from "./serials";
import { formatTradeError } from "./trades";

export {
  formatAccountError,
  formatAuthError,
  formatBinderError,
  formatCollectionError,
  formatFeedbackError,
  formatListError,
  formatRateLimitError,
  formatReportError,
  formatSerialError,
  formatTradeError,
};

/**
 * Localizes any expected error code (list/binder/auth/collection/report/
 * account/serial/trade/feedback), falling back to the raw message for
 * genuine errors.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatError(error: unknown, context: Context = {}): string {
  const message =
    formatListError(error, context) ??
    formatBinderError(error) ??
    formatAuthError(error) ??
    formatCollectionError(error) ??
    formatReportError(error) ??
    formatAccountError(error) ??
    formatTradeError(error) ??
    formatFeedbackError(error) ??
    formatRateLimitError(error) ??
    formatSerialError(error);

  if (message !== null) {
    return message;
  }

  return error instanceof Error ? error.message : String(error);
}
