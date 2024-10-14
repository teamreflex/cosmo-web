"use client";

import { PropsWithChildren } from "react";
import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import WarningDialog from "./warning-dialog";
import { preconnect, prefetchDNS } from "react-dom";

type Props = PropsWithChildren;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function ClientProviders({ children }: Props) {
  // preconnect for objekt images
  preconnect("https://imagedelivery.net");
  prefetchDNS("https://imagedelivery.net");
  // preconnect to cosmo
  preconnect("https://api.cosmo.fans");
  prefetchDNS("https://api.cosmo.fans");

  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>

      <WarningDialog />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
