"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Suspense, useCallback } from "react";
import Hydrated from "../hydrated";
import MemberFilterSkeleton from "../skeleton/member-filter-skeleton";
import MemberFilter from "../collection/member-filter";
import { ValidArtists } from "@/lib/universal/cosmo/common";
import ProgressTable from "./progress-table";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "../ui/button";
import { RefreshCcw } from "lucide-react";
import Skeleton from "../skeleton/skeleton";

type Props = {
  artists: CosmoArtistWithMembers[];
  address: string;
};

export default function ProgressRenderer({ artists, address }: Props) {
  const [
    searchParams,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const setActiveMember = useCallback((member: string) => {
    setCosmoFilters((prev) => ({
      ...prev,
      artist: null,
      member: prev.member === member ? null : member,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveArtist = useCallback((artist: string) => {
    setCosmoFilters((prev) => ({
      ...prev,
      member: null,
      artist: prev.artist === artist ? null : (artist as ValidArtists),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Hydrated fallback={<MemberFilterSkeleton />}>
        <MemberFilter
          showArtists={false}
          artists={artists}
          active={cosmoFilters.artist ?? cosmoFilters.member}
          updateArtist={setActiveArtist}
          updateMember={setActiveMember}
        />
      </Hydrated>

      <Hydrated>
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
              {cosmoFilters.member !== null ? (
                <Suspense fallback={<ProgressTableSkeleton />}>
                  <ProgressTable
                    address={address}
                    member={cosmoFilters.member}
                  />
                </Suspense>
              ) : (
                <p className="flex flex-col items-center py-6 text-sm font-semibold">
                  Select a member to view collection progress
                </p>
              )}
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </Hydrated>
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
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
