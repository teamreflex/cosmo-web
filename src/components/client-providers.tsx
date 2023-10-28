"use client";

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import AuthProvider from "./navbar/auth/auth-provider";
import WarningDialog from "./warning-dialog";

type Props = PropsWithChildren;

const queryClient = new QueryClient();

export default function ClientProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>

      <WarningDialog />
    </QueryClientProvider>
  );
}
