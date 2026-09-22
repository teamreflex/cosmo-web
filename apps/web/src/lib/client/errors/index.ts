import { formatAuthError } from "./auth";
import { formatBinderError } from "./binders";
import { formatCollectionError } from "./collections";
import { type Context, formatListError } from "./lists";
import { formatRateLimitError } from "./rate-limit";

export {
  formatAuthError,
  formatBinderError,
  formatCollectionError,
  formatListError,
  formatRateLimitError,
};

/**
 * Localizes any expected error code (list/binder/auth/collection),
 * falling back to the raw message for genuine errors.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatError(error: unknown, context: Context = {}): string {
  const message =
    formatListError(error, context) ??
    formatBinderError(error) ??
    formatAuthError(error) ??
    formatCollectionError(error) ??
    formatRateLimitError(error);

  if (message !== null) {
    return message;
  }

  return error instanceof Error ? error.message : String(error);
}
