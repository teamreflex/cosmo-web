import { init as initSentry } from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, stringifySearchWith } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { ReactNode } from "react";
import { env } from "./lib/env/client";
import { isExpectedError } from "./lib/universal/errors/expected";
import {
  sentryDenyUrls,
  sentryIgnoreErrors,
  transientFetchError,
  transientFetchSampleRate,
} from "./lib/universal/errors/sentry-noise";
import { MediaQueryProvider } from "./providers/media-query-provider";
import { routeTree } from "./routeTree.gen";

/**
 * Serialize arrays as CSV (?member=HeeJin,SeoYeon) instead of the default JSON
 * (?member=["HeeJin","SeoYeon"]). parseSearch stays default — each field's
 * castToArray() splits the CSV, and old JSON-array URLs still parse.
 */
const stringifyArrays = stringifySearchWith(
  (value) => (Array.isArray(value) ? value.join(",") : JSON.stringify(value)),
  JSON.parse,
);

/**
 * URLSearchParams percent-encodes commas; restore literal commas (valid per RFC 3986).
 */
function stringifySearch(search: Record<string, unknown>) {
  return stringifyArrays(search).replaceAll("%2C", ",");
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPendingMs: 250,
    scrollRestoration: true,
    stringifySearch,
    Wrap: (props: { children: ReactNode }) => {
      return <MediaQueryProvider>{props.children}</MediaQueryProvider>;
    },
  });

  if (!router.isServer && env.VITE_SENTRY_DSN !== undefined) {
    initSentry({
      dsn: env.VITE_SENTRY_DSN,
      sendDefaultPii: false,
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

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    handleRedirects: true,
    wrapQueryClient: true,
  });

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
