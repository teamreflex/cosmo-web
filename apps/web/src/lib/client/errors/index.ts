import { m } from "@/i18n/messages";
import { formatAccountError } from "./accounts";
import { formatAuthError } from "./auth";
import { formatBinderError } from "./binders";
import { formatCollectionError } from "./collections";
import { formatEventError } from "./events";
import { formatFeedbackError } from "./feedback";
import { type Context, formatListError } from "./lists";
import { LocalizedError } from "./localized";
import { formatRateLimitError } from "./rate-limit";
import { formatReportError } from "./reports";
import { formatSerialError } from "./serials";
import { formatTradeError } from "./trades";

export {
  formatAccountError,
  formatAuthError,
  formatBinderError,
  formatCollectionError,
  formatEventError,
  formatFeedbackError,
  formatListError,
  formatRateLimitError,
  formatReportError,
  formatSerialError,
  formatTradeError,
  LocalizedError,
};

/**
 * Localizes any expected error code (list/binder/auth/collection/report/
 * account/serial/trade/feedback/event). A `LocalizedError`
 * shows its own message, and any other error shows a generic one.
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
    formatEventError(error.message) ??
    formatRateLimitError(error.message) ??
    formatSerialError(error.message) ??
    (error instanceof LocalizedError ? error.message : m.error_unknown())
  );
}
