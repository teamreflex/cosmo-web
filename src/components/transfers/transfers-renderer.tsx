"use client";

import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import TransferRow from "./transfer-row";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Portal from "../portal";
import { ErrorBoundary } from "react-error-boundary";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";
import { Suspense, useCallback, useState } from "react";
import Skeleton from "../skeleton/skeleton";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { baseUrl } from "@/lib/query-client";
import { ofetch } from "ofetch";
import { TransferParams, TransferResult } from "@/lib/universal/transfers";
import { CosmoFilters, useCosmoFilters } from "@/hooks/use-cosmo-filters";
import FiltersContainer from "../collection/filters-container";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import MemberFilter from "../collection/member-filter";
import { useFilters } from "@/hooks/use-filters";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import { TransfersFilters } from "../collection/filter-contexts/transfers-filters";

type Props = {
  profile: PublicProfile;
};

export default function TransfersRenderer({ profile }: Props) {
  const [filters, setFilters] = useCosmoFilters();
  const [type, setType] = useState<TransferParams["type"]>("all");

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
                  address={profile.address}
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
  type: TransferParams["type"];
};

function Transfers({ address, filters, type }: TransfersProps) {
  const { searchParams } = useFilters();
  const query = useSuspenseInfiniteQuery({
    queryKey: ["transfers", address, type, filters],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint = new URL(`/api/transfers/${address}`, baseUrl());

      const query = new URLSearchParams(searchParams);
      query.set("page", pageParam.toString());
      query.set("type", type);
      query.delete("sort");

      return await ofetch<TransferResult>(endpoint.toString(), {
        retry: false,
        query: Object.fromEntries(query.entries()),
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
    retry: false,
  });

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
