import * as Sentry from "@sentry/bun";

console.log("VITE_SENTRY_DSN: ", process.env.VITE_SENTRY_DSN);
if (process.env.VITE_SENTRY_DSN !== undefined) {
  console.log("[INFO] Initializing Sentry");
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    debug: false,
    tracesSampleRate: 0,
  });
}
