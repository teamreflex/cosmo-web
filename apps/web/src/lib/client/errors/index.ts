import { formatAccountError } from "./accounts";
import { formatAuthError } from "./auth";
import { formatBinderError } from "./binders";
import { formatCollectionError } from "./collections";
import { formatFeedbackError } from "./feedback";
import { type Context, formatListError } from "./lists";
import { formatMarketInviteError } from "./market-invites";
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
  formatMarketInviteError,
  formatRateLimitError,
  formatReportError,
  formatSerialError,
  formatTradeError,
};

/**
 * Localizes any expected error code (list/binder/auth/collection/report/
 * account/serial/trade/feedback/market invite), falling back to the raw
 * message for genuine errors.
 */
export function formatError(error: Error, context: Context = {}): string {
  return (
    formatListError(error.message, context) ??
    formatBinderError(error.message) ??
    formatAuthError(error.message) ??
    formatCollectionError(error.message) ??
    formatReportError(error.message) ??
    formatAccountError(error.message) ??
    formatTradeError(error.message) ??
    formatFeedbackError(error.message) ??
    formatMarketInviteError(error.message) ??
    formatRateLimitError(error.message) ??
    formatSerialError(error.message) ??
    error.message
  );
}
