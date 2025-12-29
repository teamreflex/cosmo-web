import { useProgressFilters } from "@/hooks/use-progress-filters";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useCallback } from "react";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import MemberFilter from "../collection/member-filter";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import ProgressTable from "./progress-table";

type Props = PropsWithChildren<{
  address: string;
}>;

export default function ProgressRenderer(props: Props) {
  const { filters, setFilters, setFilter } = useProgressFilters();

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        artist: undefined,
        member: prev.member === member ? undefined : member,
      }));
    },
    [setFilters],
  );

  const setActiveArtist = useCallback(
    (artist: string) => {
      setFilters((prev) => ({
        member: undefined,
        artist: prev.artist === artist ? undefined : (artist as ValidArtist),
      }));
    },
    [setFilters],
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
              <div className="flex flex-col items-center gap-2 py-6 text-sm font-semibold">
                <p className="text-center text-sm font-semibold">
                  {m.progress_error_fetching()}
                </p>

                <Button variant="outline" onClick={resetErrorBoundary}>
                  <IconRefresh className="mr-2" /> {m.error_try_again()}
                </Button>
              </div>
            )}
          >
            {filters.member ? (
              <Suspense fallback={<ProgressTableSkeleton />}>
                <ProgressTable
                  address={props.address}
                  member={filters.member}
                  onlineType={filters.filter ?? undefined}
                  setOnlineType={(value) => setFilter("filter", value)}
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
    <div className="grid grid-flow-row gap-4 sm:items-center">
      <div className="flex w-full items-center justify-between">
        {/* member name */}
        <Skeleton className="h-9 w-32" />

        {/* type select */}
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
            <div className="col-span-3 flex items-center justify-between">
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
