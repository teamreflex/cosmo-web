"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "react-query";
import { useInView } from "react-intersection-observer";
import { PropsWithClassName, cn } from "@/lib/utils";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo";
import {
  CollectionFilters,
  collectionFilters,
} from "@/hooks/use-collection-filters";
import Objekt from "../objekt/objekt";
import MemberFilter from "../collection/member-filter";
import { IndexedCosmoResponse, ObjektList } from "@/lib/universal/objekt-index";
import ObjektSidebar from "../objekt/objekt-sidebar";

type Props = PropsWithClassName<{
  list: ObjektList;
  artists: CosmoArtistWithMembers[];
  filters: CollectionFilters;
  setFilters: (filters: CollectionFilters) => void;
  authenticated: boolean;
}>;

export default function ObjektListList({
  list,
  artists,
  filters,
  setFilters,
  authenticated,
  className,
}: Props) {
  const { ref, inView } = useInView();

  async function fetchObjekts({ pageParam = 0 }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      false
    );
    searchParams.set("page", pageParam.toString());
    searchParams.set("list", list.slug);

    const result = await fetch(`/api/objekts?${searchParams.toString()}`);
    return (await result.json()) as IndexedCosmoResponse;
  }

  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: [`objekt-list`, filters],
    queryFn: fetchObjekts,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  // reset query upon filter change
  const refetchPage = useCallback(
    () => refetch({ refetchPage: (_, index) => index === 0 }),
    [refetch]
  );

  useEffect(() => {
    refetchPage();
  }, [filters, refetchPage]);

  return (
    <div className={cn("flex flex-col", className)}>
      <MemberFilter
        artists={artists}
        filters={filters}
        updateFilters={setFilters}
      />

      <div className="flex flex-col items-center">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 py-2">
          {status === "loading" ? (
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
                    {group.objekts.map((objekt) => (
                      <Objekt
                        key={objekt.id}
                        objekt={objekt}
                        authenticated={authenticated}
                      >
                        <ObjektSidebar />
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
