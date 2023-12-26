"use client";

import Objekt from "../objekt/objekt";
import { Fragment, ReactNode, useEffect } from "react";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import {
  QueryFunction,
  QueryKey,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { CollectionFilters } from "@/hooks/use-collection-filters";
import MemberFilter from "../collection/member-filter";
import { ValidObjekt } from "./util";
import Portal from "../portal";
import Hydrated from "../hydrated";
import MemberFilterSkeleton from "../skeleton/member-filter-skeleton";

export type ObjektResponse<TObjektType extends ValidObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: TObjektType[];
  nextStartAfter?: number | string | undefined;
};

type Props<TObjektType extends ValidObjekt> = {
  authenticated: boolean;
  artists: CosmoArtistWithMembers[];
  filters: CollectionFilters;
  setFilters: (filters: CollectionFilters) => void;
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
  const { ref, inView } = useInView();

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

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  return (
    <div className="flex flex-col">
      <Portal to="#objekt-total">
        <p className="font-semibold">{total} total</p>
      </Portal>

      <Hydrated fallback={<MemberFilterSkeleton />}>
        <MemberFilter
          artists={artists}
          filters={filters}
          updateFilters={setFilters}
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
                data.pages.map((group, i) => (
                  <Fragment key={i}>
                    {group.objekts.filter(getObjektDisplay).map((objekt) => (
                      <Objekt
                        key={getObjektId(objekt)}
                        objekt={objekt}
                        authenticated={authenticated}
                      >
                        {objektSlot}
                      </Objekt>
                    ))}
                  </Fragment>
                ))}
            </>
          )}
        </div>

        {status !== "error" && (
          <div className="flex justify-center py-6">
            <button
              ref={ref}
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loading />
              ) : hasNextPage ? (
                <LoadMore />
              ) : (
                <></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadMore() {
  return <ChevronDown className="animate-bounce h-12 w-12" />;
}

function Loading() {
  return <Loader2 className="animate-spin h-12 w-12" />;
}

function Error() {
  return (
    <div className="col-span-full flex flex-col gap-2 items-center py-12">
      <HeartCrack className="h-12 w-12" />
      <p>There was an error loading objekts</p>
    </div>
  );
}
