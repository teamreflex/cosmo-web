"use client";

import { LuHeartCrack, LuRefreshCcw } from "react-icons/lu";
import { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "./ui/button";

type Props = PropsWithChildren<{
  message: string;
}>;

export default function ApolloErrorBoundary({ children, message }: Props) {
  return (
    <ErrorBoundary fallback={<Error message={message} />}>
      {children}
    </ErrorBoundary>
  );
}

export function Error({ message }: { message: string }) {
  function refresh() {
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2 items-center container py-12">
      <LuHeartCrack className="w-24 h-24" />
      <p className="font-semibold text-sm text-center">{message}</p>

      <Button variant="outline" onClick={refresh}>
        <LuRefreshCcw className="mr-2" /> Try Again
      </Button>
    </div>
  );
}
