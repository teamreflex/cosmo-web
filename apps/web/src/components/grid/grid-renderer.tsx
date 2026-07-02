import MemberFilter from "@/components/collection/member-filter";
import GridLedgerView from "@/components/grid/grid-ledger-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
import { useArtists } from "@/hooks/use-artists";
import { useGridFilters } from "@/hooks/use-grid-filters";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { IconLayoutGrid, IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  address: string;
};

export default function GridRenderer(props: Props) {
  const { filters, setFilters } = useGridFilters();
  const { getArtistForMember } = useArtists();

  const memberArtist = filters.member
    ? getArtistForMember(filters.member)
    : undefined;
  const artist = filters.artist ?? memberArtist;

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        // deselecting a member falls back to their artist's overview
        artist: prev.member === member ? getArtistForMember(member) : undefined,
        member: prev.member === member ? undefined : member,
      }));
    },
    [setFilters, getArtistForMember],
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
      <TitleHeader title={m.grid_title()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <MemberFilter
              activeArtist={filters.artist ?? null}
              activeMembers={filters.member ? [filters.member] : []}
              updateArtist={setActiveArtist}
              updateMember={setActiveMember}
            />
          </div>
        </div>
      </TitleHeader>

      <div className="container flex flex-col gap-6 pt-4 pb-8">
        {artist === undefined ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <IconLayoutGrid className="size-8" />
            <p className="text-center text-sm font-semibold">
              {m.grid_select_prompt()}
            </p>
          </div>
        ) : (
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div className="flex flex-col items-center gap-2 py-6 text-sm font-semibold">
                    <p className="text-center text-sm font-semibold">
                      {m.grid_error_loading()}
                    </p>

                    <Button variant="outline" onClick={resetErrorBoundary}>
                      <IconRefresh className="mr-2" /> {m.error_try_again()}
                    </Button>
                  </div>
                )}
              >
                <Suspense
                  fallback={
                    <GridLedgerSkeleton detail={filters.member !== undefined} />
                  }
                >
                  <GridLedgerView
                    key={`${props.address}-${artist}`}
                    address={props.address}
                    artist={artist}
                    member={filters.member ?? undefined}
                    onSelectMember={setActiveMember}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        )}
      </div>
    </div>
  );
}

function GridLedgerSkeleton({ detail }: { detail: boolean }) {
  if (detail) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-8 w-40" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
