import { ReactNode, Suspense, useCallback } from "react";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import MemberFilter from "../collection/member-filter";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Button } from "../ui/button";
import Skeleton from "../skeleton/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import SkeletonGradient from "../skeleton/skeleton-overlay";

type Props = {
  children: ReactNode;
  gridColumns: number;
};

export default function FilteredObjektDisplay({
  children,
  gridColumns,
}: Props) {
  const [filters, setFilters] = useCosmoFilters();

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
    <div className="flex flex-col">
      <MemberFilter
        active={filters.artist ?? filters.member}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />

      <div className="flex flex-col items-center w-full">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <div className="flex flex-col gap-2 items-center w-full py-12">
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
                    className="relative py-2 grid gap-4 w-full grid-cols-3 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
                  >
                    <SkeletonGradient />
                    {Array.from({ length: gridColumns * 3 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="z-10 w-full aspect-photocard rounded-lg md:rounded-xl lg:rounded-2xl"
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
