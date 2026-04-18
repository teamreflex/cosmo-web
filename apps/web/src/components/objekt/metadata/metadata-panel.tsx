import type { Objekt } from "@/lib/universal/objekt-conversion";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../../ui/skeleton";
import { MetadataDialogError } from "./common";
import type { ObjektMetadataTab } from "./common";
import Metadata from "./metadata";

type Props = {
  objekt: Objekt.Collection;
  tab: ObjektMetadataTab;
  setTab: (tab: ObjektMetadataTab) => void;
};

export default function MetadataPanel(props: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={MetadataDialogError} onReset={reset}>
          <Suspense fallback={<Fallback />}>
            <Metadata {...props} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function Fallback() {
  return (
    <div className="flex flex-col">
      {/* stats row skeleton — fixed height so no layout shift */}
      <div className="flex items-stretch border-b border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-border px-4 py-3 last:border-r-0"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-1 h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 px-4 py-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
