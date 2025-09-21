import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { hashFn } from "wagmi/query";
import { MediaQueryProvider } from "@/hooks/use-media-query";

export function getContext() {
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

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <MediaQueryProvider>{children}</MediaQueryProvider>
    </QueryClientProvider>
  );
}
