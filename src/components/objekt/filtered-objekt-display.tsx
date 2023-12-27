"use client";

import Objekt from "../objekt/objekt";
import { ReactNode, Ref, forwardRef, useCallback, useEffect } from "react";
import { ChevronDown, HeartCrack, Loader2, PawPrint } from "lucide-react";
import {
  QueryFunction,
  QueryKey,
  QueryStatus,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import {
  CosmoArtistWithMembers,
  CosmoMember,
} from "@/lib/universal/cosmo/artists";
import MemberFilter from "../collection/member-filter";
import { ValidObjekt } from "./util";
import Portal from "../portal";
import Hydrated from "../hydrated";
import MemberFilterSkeleton from "../skeleton/member-filter-skeleton";
import { ValidArtists } from "@/lib/universal/cosmo/common";
import { CosmoFilters } from "@/hooks/use-cosmo-filters";

export type ObjektResponse<TObjektType extends ValidObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: TObjektType[];
  nextStartAfter?: number | string | undefined;
};

type Props<TObjektType extends ValidObjekt> = {
  authenticated: boolean;
  artists: CosmoArtistWithMembers[];
  filters: CosmoFilters;
  setFilters: (filters: CosmoFilters) => void;
  queryKey: QueryKey;
  queryFunction: QueryFunction<
    ObjektResponse<TObjektType>,
    QueryKey,
    string | number | undefined
  >;
  getObjektId: (objekt: TObjektType) => string | number;
  getObjektDisplay: (objekt: TObjektType) => boolean;
  objektSlot: ReactNode;
};

export default function FilteredObjektDisplay<TObjektType extends ValidObjekt>({
  authenticated,
  artists,
  filters,
  setFilters,
  queryKey,
  queryFunction,
  getObjektId,
  getObjektDisplay,
  objektSlot,
}: Props<TObjektType>) {
  console.log("[render]: FilteredObjektDisplay");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [...queryKey, filters],
      queryFn: queryFunction,
      initialPageParam: "0",
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    });

  const total = data?.pages[0].total ?? 0;
  const objekts = (data?.pages.flatMap((page) => page.objekts) ?? []).filter(
    getObjektDisplay
  );

  const setActiveMember = useCallback(
    (member: CosmoMember) => {
      setFilters({
        ...filters,
        artist: null,
        member: filters.member === member.name ? null : member.name,
      });
    },
    [filters, setFilters]
  );

  const setActiveArtist = useCallback(
    (artist: CosmoArtistWithMembers) => {
      setFilters({
        ...filters,
        member: null,
        artist:
          filters.artist === artist.name ? null : (artist.name as ValidArtists),
      });
    },
    [filters, setFilters]
  );

  return (
    <div className="flex flex-col">
      <Portal to="#objekt-total">
        <p className="font-semibold">{total} total</p>
      </Portal>

      <Hydrated fallback={<MemberFilterSkeleton />}>
        <MemberFilter
          artists={artists}
          active={filters.artist ?? filters.member}
          updateArtist={setActiveArtist}
          updateMember={setActiveMember}
        />
      </Hydrated>

      <div className="flex flex-col items-center">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 py-2">
          {status === "pending" ? (
            <div className="flex col-span-full py-12">
              <Loader2 className="animate-spin h-24 w-24" />
            </div>
          ) : status === "error" ? (
            <Error />
          ) : (
            <>
              {data !== undefined &&
                objekts.map((objekt) => (
                  <Objekt
                    key={getObjektId(objekt)}
                    objekt={objekt}
                    authenticated={authenticated}
                  >
                    {objektSlot}
                  </Objekt>
                ))}
            </>
          )}
        </div>

        <Pending
          status={status}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </div>
    </div>
  );
}

function Error() {
  return (
    <div className="col-span-full flex flex-col gap-2 items-center py-12">
      <HeartCrack className="h-12 w-12" />
      <p>There was an error loading objekts</p>
    </div>
  );
}

type PendingProps = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};
function Pending({
  status,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: PendingProps) {
  const { ref, inView } = useInView();

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  return (
    <div className="flex justify-center py-6">
      {/* ready to fetch next page */}
      {status === "success" && hasNextPage && !isFetchingNextPage && (
        <button
          ref={ref}
          onClick={fetchNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          <ChevronDown className="animate-bounce h-12 w-12" />
        </button>
      )}

      {/* fetching next page */}
      {isFetchingNextPage && <Loader2 className="animate-spin h-12 w-12" />}

      {/* no more pages */}
      {status === "success" && !hasNextPage && <PawPrint className="h-6 w-6" />}
    </div>
  );
}
