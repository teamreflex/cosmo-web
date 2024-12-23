import { env } from "@/env.mjs";
import * as Sentry from "@sentry/nextjs";

const stackPatterns = [
  // can't get around release caching
  /ChunkLoadError/,
];

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 0.15,
  // ignore any errors based on message
  ignoreErrors: [
    // Maximize-Video seems to be the main culprit, stacktrace doesn't work here
    "(intermediate value)() is not a function",
    // can't do much about connection issues
    "Connection closed.",
  ],
  // ignore any errors based on stacktrace
  beforeSend(event, hint) {
    const stack = hint.syntheticException?.stack;
    if (stack && stackPatterns.some((pattern) => pattern.test(stack))) {
      return null;
    }

    return event;
  },
});
