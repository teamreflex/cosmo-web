import { env } from "@/env.mjs";
import * as Sentry from "@sentry/nextjs";

const stackPatterns = [
  // Maximize-Video seems to be the main culprit
  new RegExp("app:///userscripts"),
  // can't get around release caching
  /ChunkLoadError/,
];

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 0.5,
  // ignore any errors with stacktraces that match specific patterns
  beforeSend(event, hint) {
    const stack = hint.syntheticException?.stack;
    if (stack) {
      if (stackPatterns.some((pattern) => pattern.test(stack))) {
        return null;
      }
    }

    return event;
  },
});
