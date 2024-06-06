"use client";

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// import AuthProvider from "./navbar/auth/auth-provider";
import WarningDialog from "./warning-dialog";
import { preconnect, prefetchDNS } from "react-dom";

type Props = PropsWithChildren;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
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
      {children}

      <WarningDialog />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
