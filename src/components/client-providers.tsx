"use client";

import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import WarningDialog from "./warning-dialog";
import { preconnect, prefetchDNS } from "react-dom";
import { getQueryClient } from "@/lib/query-client";

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
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>

      <WarningDialog />
      <ReactQueryDevtools buttonPosition="top-right" />
    </QueryClientProvider>
  );
}
