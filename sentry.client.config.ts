import { env } from "@/env.mjs";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 0.5,
});
