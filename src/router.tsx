import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hashFn } from "wagmi/query";
import { routeTree } from "./routeTree.gen";
import { MediaQueryProvider } from "./hooks/use-media-query";

function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        queryKeyHashFn: hashFn,
      },
    },
  });

  return {
    queryClient,
  };
}

export function getRouter() {
  const context = getContext();

  const router = createRouter({
    routeTree,
    context: { ...context },
    defaultPreload: "intent",
    scrollRestoration: true,
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <QueryClientProvider client={context.queryClient}>
          <MediaQueryProvider>{props.children}</MediaQueryProvider>
        </QueryClientProvider>
      );
    },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: context.queryClient,
  });

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
