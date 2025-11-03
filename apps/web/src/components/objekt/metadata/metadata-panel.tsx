import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../../ui/skeleton";
import Metadata from "./metadata";
import { MetadataDialogError } from "./common";
import type { ObjektMetadataTab } from "./common";
import type { Objekt } from "@/lib/universal/objekt-conversion";

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
    <div className="flex grow flex-col justify-between gap-2 px-4">
      <div className="flex min-h-10 flex-col gap-2 sm:h-full">
        <Skeleton className="mx-auto h-8 w-46 rounded-md md:mx-0" />
        <Skeleton className="h-3 w-full rounded-full sm:h-5" />
        <Skeleton className="h-3 w-2/3 rounded-full sm:h-5" />
      </div>
    </div>
  );
}
