"use client";

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import AuthProvider from "./auth-provider";

type Props = PropsWithChildren;

const queryClient = new QueryClient();

export default function ClientProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
