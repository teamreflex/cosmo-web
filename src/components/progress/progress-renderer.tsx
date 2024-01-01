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

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ error, resetErrorBoundary }) => (
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
              <Suspense fallback={<Loading />}>
                <ProgressTable address={address} member={cosmoFilters.member} />
              </Suspense>
            ) : (
              <p className="flex flex-col items-center py-6 text-sm font-semibold">
                Select a member to view your collection progress
              </p>
            )}
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto py-6 bg-accent rounded-lg animate-pulse h-24 w-full sm:w-1/2" />
  );
}
