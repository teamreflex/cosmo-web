import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import Portal from "../portal";
import { InfiniteQueryNext } from "../infinite-query-pending";
import FiltersContainer from "../collection/filters-container";
import MemberFilter from "../collection/member-filter";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import { TransfersFilters } from "../collection/filter-contexts/transfers-filters";
import TransferRow from "./transfer-row";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { TransferType } from "@/lib/universal/transfers";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { CosmoFilters } from "@/hooks/use-cosmo-filters";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { transfersQuery } from "@/lib/queries/objekt-queries";

type Props = {
  cosmo: PublicCosmo;
};

export default function TransfersRenderer({ cosmo }: Props) {
  const { filters, setFilters } = useCosmoFilters();
  const [type, setType] = useState<TransferType>("all");

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        artist: undefined,
        member: prev.member === member ? undefined : member,
      }));
    },
    [setFilters]
  );

  const setActiveArtist = useCallback(
    (artist: string) => {
      setFilters((prev) => ({
        member: undefined,
        artist: prev.artist === artist ? undefined : (artist as ValidArtist),
      }));
    },
    [setFilters]
  );

  return (
    <div className="flex flex-col">
      <FiltersContainer isPortaled>
        <TransfersFilters type={type} setType={setType} />
      </FiltersContainer>

      <MemberFilter
        active={filters.artist ?? filters.member}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />

      <div className="pt-2">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <div className="flex flex-col gap-2 items-center w-full">
                  <div className="flex flex-col gap-2 justify-center items-center py-12">
                    <HeartCrack className="h-12 w-12" />
                    <p>There was an error loading transfers</p>
                  </div>
                  <Button variant="outline" onClick={resetErrorBoundary}>
                    <RefreshCcw className="mr-2" /> Retry
                  </Button>
                </div>
              )}
            >
              <Suspense fallback={<TransfersSkeleton />}>
                <Transfers
                  address={cosmo.address}
                  filters={filters}
                  type={type}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </div>
  );
}

type TransfersProps = {
  address: string;
  filters: CosmoFilters;
  type: TransferType;
};

function Transfers({ address, filters, type }: TransfersProps) {
  const query = useSuspenseInfiniteQuery(
    transfersQuery(address, filters, type)
  );

  const rows = query.data.pages
    .flatMap((p) => p.results)
    .filter(
      (row, index, self) =>
        index === self.findIndex((r) => r.transfer.id === row.transfer.id)
    );

  return (
    <div className="flex flex-col rounded-lg border border-accent text-sm">
      <div className="items-center grid grid-cols-[3fr_2fr_2fr] gap-2 h-12 px-4 text-left align-middle font-medium text-muted-foreground">
        <span>Objekt</span>
        <span>User</span>
        <span className="text-right">Date</span>
      </div>

      <div className="flex flex-col">
        {rows.map((row) => (
          <TransferRow key={row.transfer.id} row={row} address={address} />
        ))}
      </div>

      <Portal to="#pagination">
        <InfiniteQueryNext
          status={query.status}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </div>
  );
}

export function TransfersSkeleton() {
  return (
    <div className="relative">
      <SkeletonGradient />

      <div className="realtive w-full flex flex-col rounded-lg border border-accent text-sm overflow-hidden">
        <div className="items-center grid grid-cols-[3fr_2fr_2fr] gap-2 h-12 px-4 text-left align-middle font-medium text-muted-foreground">
          <span>Objekt</span>
          <span>User</span>
          <span className="text-right">Date</span>
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-none h-14 border-t border-accent"
          />
        ))}
      </div>
    </div>
  );
}
