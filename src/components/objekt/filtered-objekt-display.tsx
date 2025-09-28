import { Suspense, useCallback } from "react";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import MemberFilter from "../collection/member-filter";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { ReactNode } from "react";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

type Props = {
  children: ReactNode;
  gridColumns: number;
};

export default function FilteredObjektDisplay({
  children,
  gridColumns,
}: Props) {
  const { filters, setFilters } = useCosmoFilters();

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
    <div className="flex flex-col">
      <MemberFilter
        active={filters.artist ?? filters.member}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />

      <div className="flex w-full flex-col items-center">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <div className="flex w-full flex-col items-center gap-2 py-12">
                  <div className="flex items-center gap-2">
                    <HeartCrack className="h-6 w-6" />
                    <p className="text-sm font-semibold">
                      Error loading objekts
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetErrorBoundary}>
                    <RefreshCcw className="mr-2" /> Retry
                  </Button>
                </div>
              )}
            >
              <Suspense
                fallback={
                  <div
                    style={{ "--grid-columns": gridColumns }}
                    className="relative grid w-full grid-cols-3 gap-4 py-2 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
                  >
                    <SkeletonGradient />
                    {Array.from({ length: gridColumns * 3 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="z-10 aspect-photocard w-full rounded-lg md:rounded-xl lg:rounded-2xl"
                      />
                    ))}
                  </div>
                }
              >
                {children}
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>

        <div id="pagination" />
      </div>
    </div>
  );
}
