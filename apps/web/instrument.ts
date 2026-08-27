import * as Sentry from "@sentry/bun";
import { isExpectedError } from "./src/lib/universal/errors/expected";

/**
 * Skip Start notFound() "errors".
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary predicate; thrown values are genuinely unknown
function isNotFoundSignal(value: unknown): boolean {
  return (
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- duck-typing the notFound() marker is the contract
    typeof value === "object" &&
    value !== null &&
    "isNotFound" in value &&
    value.isNotFound === true
  );
}

/**
 * Skip Start redirect() "errors", thrown as a 3xx Response.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary predicate; thrown values are genuinely unknown
function isRedirectSignal(value: unknown): boolean {
  return value instanceof Response && value.status >= 300 && value.status < 400;
}

if (process.env.VITE_SENTRY_DSN !== undefined) {
  console.log("[INFO] Initializing Sentry");
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    debug: false,
    tracesSampleRate: 0,
    beforeSend(event, hint) {
      if (
        isExpectedError(hint.originalException) ||
        isNotFoundSignal(hint.originalException) ||
        isRedirectSignal(hint.originalException)
      ) {
        return null;
      }
      return event;
    },
  });
}
