import { isExpectedError } from "@/lib/universal/errors/expected";
import {
  sentryDenyUrls,
  sentryIgnoreErrors,
  transientFetchError,
  transientFetchSampleRate,
} from "@/lib/universal/errors/sentry-noise";
import { init } from "@sentry/tanstackstart-react";

/**
 * Starts the browser Sentry client. `getRouter()` imports this lazily, so the SDK stays out of the entry chunk.
 */
export function initSentry(dsn: string) {
  init({
    dsn,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
        response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      },
      httpBodies: [],
      urlQueryParams: {
        deny: ["forwarded", "-ip", "remote-", "via", "-user"],
      },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
    debug: false,
    tracesSampleRate: 0,
    ignoreErrors: sentryIgnoreErrors,
    denyUrls: sentryDenyUrls,
    beforeSend(event, hint) {
      if (isExpectedError(hint.originalException)) {
        return null;
      }
      // downsample generic fetch failures so an outage still spikes
      const message = event.exception?.values?.[0]?.value ?? "";
      if (
        transientFetchError.test(message) &&
        Math.random() > transientFetchSampleRate
      ) {
        return null;
      }
      // drop injected/extension noise: stack frames exist but none are ours
      const frames = event.exception?.values?.flatMap(
        (value) => value.stacktrace?.frames ?? [],
      );
      if (
        frames !== undefined &&
        frames.length > 0 &&
        frames.every((frame) => frame.in_app !== true)
      ) {
        return null;
      }
      return event;
    },
  });
}
