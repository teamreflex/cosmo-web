import { Suspense, useCallback } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";
import MemberFilter from "../collection/member-filter";
import { Skeleton } from "../ui/skeleton";
import ProgressTable from "./progress-table";
import type { PropsWithChildren } from "react";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

type Props = PropsWithChildren<{
  address: string;
}>;

export default function ProgressRenderer(props: Props) {
  const { filters, setFilters } = useCosmoFilters();

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        artist: null,
        member: prev.member === member ? null : member,
      }));
    },
    [setFilters]
  );

  const setActiveArtist = useCallback(
    (artist: string) => {
      setFilters((prev) => ({
        member: null,
        artist: prev.artist === artist ? null : (artist as ValidArtist),
      }));
    },
    [setFilters]
  );

  return (
    <div className="flex flex-col gap-6">
      <MemberFilter
        active={filters.artist ?? filters.member}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="flex flex-col gap-2 items-center py-6 text-sm font-semibold">
                <p className="font-semibold text-sm text-center">
                  Error fetching progress
                </p>

                <Button variant="outline" onClick={resetErrorBoundary}>
                  <RefreshCcw className="mr-2" /> Try Again
                </Button>
              </div>
            )}
          >
            {filters.member ? (
              <Suspense fallback={<ProgressTableSkeleton />}>
                <ProgressTable
                  address={props.address}
                  member={filters.member}
                />
              </Suspense>
            ) : (
              props.children
            )}
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}

function ProgressTableSkeleton() {
  return (
    <div className="grid grid-flow-row sm:items-center gap-4">
      <div className="flex items-center justify-between w-full">
        {/* member name */}
        <Skeleton className="h-9 w-32" />

        {/* type select */}
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
            <div className="flex items-center justify-between col-span-3">
              {/* season */}
              <Skeleton className="h-7 w-24" />

              {/* percentage */}
              <Skeleton className="h-5 w-16" />
            </div>

            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-26" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
