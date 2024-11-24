import { env } from "@/env.mjs";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 0.5,
  ignoreErrors: [
    // Maximize-Video seems to be the main culprit
    "app:///userscripts",
    // can't get around release caching
    "ChunkLoadError",
  ],
});
