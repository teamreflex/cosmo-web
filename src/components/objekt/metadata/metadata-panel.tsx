import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../../ui/skeleton";
import Metadata from "./metadata";
import { MetadataDialogError } from "./common";
import type { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  objekt: Objekt.Collection;
};

export default function MetadataPanel({ objekt }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={MetadataDialogError} onReset={reset}>
          <Suspense
            fallback={
              <div className="flex flex-col justify-between h-full gap-2 mx-4">
                <div className="flex flex-col gap-2 h-10 sm:h-full">
                  <Skeleton className="w-full h-4 sm:h-5 rounded-full" />
                  <Skeleton className="w-2/3 h-4 sm:h-5 rounded-full" />
                </div>

                <div className="flex flex-row-reverse gap-2 self-end mt-auto w-full">
                  <Skeleton className="w-12 h-9 rounded-md" />
                  <Skeleton className="w-12 h-9 rounded-md" />
                </div>
              </div>
            }
          >
            <Metadata objekt={objekt} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
