import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { QueryClient } from "@tanstack/react-query";
import { hashFn } from "wagmi/query";
import * as Sentry from "@sentry/tanstackstart-react";
import { routeTree } from "./routeTree.gen";
import { MediaQueryProvider } from "./hooks/use-media-query";
import { env } from "./lib/env/client";
import type { ReactNode } from "react";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        queryKeyHashFn: hashFn,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPendingMs: 250,
    Wrap: (props: { children: ReactNode }) => {
      return <MediaQueryProvider>{props.children}</MediaQueryProvider>;
    },
  });

  if (!router.isServer) {
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      sendDefaultPii: true,
      integrations: [],
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
