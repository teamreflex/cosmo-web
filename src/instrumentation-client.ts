import { env } from "@/env";
import * as Sentry from "@sentry/nextjs";

const stackPatterns = [
  // problematic extensions
  "app:///instant-web",
  "app:///Maximize-Video",
];

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 0.15,
  // ignore any errors based on message
  ignoreErrors: [
    // client connection issues
    "Connection closed.",
    // release caching
    "ChunkLoadError",
    // benign
    "ResizeObserver loop limit exceeded",
    // ???
    "Method not found",
    // android camera issue?
    "Could not start video source",
  ],
  // ignore any errors based on stacktrace
  beforeSend(event) {
    const stacktrace = event.exception?.values?.[0]?.stacktrace;
    if (stacktrace?.frames) {
      const shouldFilter = stacktrace.frames.some((frame) =>
        stackPatterns.some((pattern) => frame.filename?.includes(pattern))
      );

      if (shouldFilter) {
        return null;
      }
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
