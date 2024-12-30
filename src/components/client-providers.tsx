"use client";

import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { preconnect, prefetchDNS } from "react-dom";
import { getQueryClient } from "@/lib/query-client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { MediaQueryProvider } from "@/hooks/use-media-query";

type Props = PropsWithChildren;

export default function ClientProviders({ children }: Props) {
  // preconnect for objekt images
  preconnect("https://imagedelivery.net");
  prefetchDNS("https://imagedelivery.net");
  // preconnect to cosmo
  preconnect("https://api.cosmo.fans");
  prefetchDNS("https://api.cosmo.fans");

  const queryClient = getQueryClient();

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <ReactQueryStreamedHydration>
          <MediaQueryProvider>{children}</MediaQueryProvider>
        </ReactQueryStreamedHydration>

        <ReactQueryDevtools buttonPosition="top-right" />
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
