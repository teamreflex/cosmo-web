import { init as initSentry } from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { ReactNode } from "react";
import { env } from "./lib/env/client";
import { isExpectedError } from "./lib/universal/errors/expected";
import {
  sentryDenyUrls,
  sentryIgnoreErrors,
  transientFetchError,
  transientFetchSampleRate,
} from "./lib/universal/errors/sentry-noise";
import { stringifySearch } from "./lib/universal/search-params";
import { MediaQueryProvider } from "./providers/media-query-provider";
import { routeTree } from "./routeTree.gen";

/**
 * The nonce `main.ts` puts in this response's CSP (via its CSP_NONCE_HEADER),
 * applied to every inline script the router renders.
 */
const getCspNonce = createIsomorphicFn()
  .server(() => getRequestHeader("x-csp-nonce"))
  .client(() => undefined);

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
    // query is the caching authority
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 250,
    scrollRestoration: true,
    stringifySearch,
    ssr: { nonce: getCspNonce() },
    Wrap: (props: { children: ReactNode }) => {
      return <MediaQueryProvider>{props.children}</MediaQueryProvider>;
    },
  });

  if (!router.isServer && env.VITE_SENTRY_DSN !== undefined) {
    initSentry({
      dsn: env.VITE_SENTRY_DSN,
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
