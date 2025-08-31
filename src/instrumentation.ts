import * as Sentry from "@sentry/nextjs";
import { env } from "./env";

export async function register() {
  if (env.NEXT_PUBLIC_VERCEL_ENV !== "production") {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      debug: false,
      ignoreErrors: [
        // it happens, can't do much about it
        "NeonDbError",
        // we have no control over the cosmo API
        "TimeoutError",
        "<no response> fetch failed",
        // i assume something to do with CJK characters
        "Cannot convert argument to a ByteString",
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
