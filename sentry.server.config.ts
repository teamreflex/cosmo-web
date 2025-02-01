import { env } from "@/env";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
  ignoreErrors: [
    // it happens, can't do much about it
    "NeonDbError",
    // we have no control over the cosmo API
    "TimeoutError",
    "<no response> fetch failed",
  ],
});
