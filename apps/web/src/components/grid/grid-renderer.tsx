import GridLedgerSkeleton from "@/components/grid/grid-ledger-skeleton";
import GridLedgerView from "@/components/grid/grid-ledger-view";
import { Button } from "@/components/ui/button";
import { useArtists } from "@/hooks/use-artists";
import { useGridFilters } from "@/hooks/use-grid-filters";
import { m } from "@/i18n/messages";
import { IconLayoutGrid, IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  address: string;
};

export default function GridRenderer(props: Props) {
  const { filters, setActiveMember } = useGridFilters();
  const { getArtistForMember } = useArtists();

  const memberArtist = filters.member
    ? getArtistForMember(filters.member)
    : undefined;
  const artist = filters.artist ?? memberArtist;

  return (
    <div className="flex flex-col">
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
