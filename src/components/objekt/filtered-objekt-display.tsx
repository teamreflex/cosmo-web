"use client";

import { ObjektProps } from "../objekt/objekt";
import { ReactElement, cloneElement, useCallback, useMemo } from "react";
import { HeartCrack, Loader2 } from "lucide-react";
import {
  QueryFunction,
  QueryKey,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import MemberFilter from "../collection/member-filter";
import Portal from "../portal";
import Hydrated from "../hydrated";
import MemberFilterSkeleton from "../skeleton/member-filter-skeleton";
import { ValidArtists } from "@/lib/universal/cosmo/common";
import {
  CollectionDataSource,
  CosmoFilters,
  SetCosmoFilters,
} from "@/hooks/use-cosmo-filters";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ValidObjekt } from "@/lib/universal/objekts";
import { cn, typedMemo } from "@/lib/utils";

export type ObjektResponse<TObjektType extends ValidObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: TObjektType[];
  nextStartAfter?: number | undefined;
};

type Props<TObjektType extends ValidObjekt> = {
  children: (props: ObjektProps<TObjektType>) => ReactElement;
  artists: CosmoArtistWithMembers[];
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  queryKey: QueryKey;
  queryFunction: QueryFunction<
    ObjektResponse<TObjektType>,
    QueryKey,
    number | undefined
  >;
  getObjektId: (objekt: TObjektType) => string;
  getObjektDisplay?: (objekt: TObjektType) => boolean;
  gridColumns?: number;
  dataSource: CollectionDataSource;
};

export default typedMemo(function FilteredObjektDisplay<
  TObjektType extends ValidObjekt
>({
  children,
  artists,
  filters,
  setFilters,
  queryKey,
  queryFunction,
  getObjektId,
  getObjektDisplay = () => true,
  gridColumns = 4,
  dataSource,
}: Props<TObjektType>) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [...queryKey, dataSource, filters],
      queryFn: queryFunction,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    });

  const total = Number(data?.pages[0].total ?? 0);
  const objekts = useMemo(() => {
    return (data?.pages.flatMap((page) => page.objekts) ?? []).filter(
      getObjektDisplay
    );
  }, [data, getObjektDisplay]);

  const setActiveMember = useCallback((member: string) => {
    setFilters((prev) => ({
      ...prev,
      artist: null,
      member: prev.member === member ? null : member,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveArtist = useCallback((artist: string) => {
    setFilters((prev) => ({
      ...prev,
      member: null,
      artist: prev.artist === artist ? null : (artist as ValidArtists),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col">
      <Portal to="#objekt-total">
        <p className="font-semibold">{total.toLocaleString()} total</p>
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
        <div
          className={cn(
            "grid grid-cols-3 gap-4 py-2",
            `md:grid-cols-${gridColumns}`
          )}
        >
          {status === "pending" ? (
            <div className="flex col-span-full py-12">
              <Loader2 className="animate-spin h-24 w-24" />
            </div>
          ) : status === "error" ? (
            <Error />
          ) : (
            objekts.map((objekt) =>
              cloneElement(children({ objekt, id: getObjektId(objekt) }), {
                key: getObjektId(objekt),
              })
            )
          )}
        </div>

        <InfiniteQueryNext
          status={status}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </div>
    </div>
  );
});

function Error() {
  return (
    <div className="col-span-full flex flex-col gap-2 items-center py-12">
      <HeartCrack className="h-12 w-12" />
      <p>There was an error loading objekts</p>
    </div>
  );
}
