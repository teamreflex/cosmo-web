import { noop, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { ReactNode } from "react";
import { env } from "./lib/env/client";
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

  const dsn = env.VITE_SENTRY_DSN;
  if (!router.isServer && dsn !== undefined) {
    // a blocked or failed chunk just leaves the session unreported
    import("./lib/client/sentry")
      .then(({ initSentry }) => initSentry(dsn))
      .catch(noop);
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
