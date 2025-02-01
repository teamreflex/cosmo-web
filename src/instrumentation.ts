import * as Sentry from "@sentry/nextjs";
import { env } from "./env";

export async function register() {
  if (env.NEXT_PUBLIC_VERCEL_ENV !== "production") {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
