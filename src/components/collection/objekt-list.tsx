"use client";

import {
  CosmoArtistWithMembers,
  ObjektQueryParams,
  OwnedObjekt,
  OwnedObjektsResult,
} from "@/lib/server/cosmo";
import Objekt from "./objekt";
import { Fragment, createContext, useCallback, useEffect } from "react";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "react-query";
import { useInView } from "react-intersection-observer";
import MemberFilter from "./member-filter";
import { PropsWithClassName, cn } from "@/lib/utils";

export const RefetchObjektsContext = createContext<() => void>(() => void 0);

type Props = PropsWithClassName<{
  lockedTokenIds: number[];
  showLocked: boolean;
  artists: CosmoArtistWithMembers[];
  filters: ObjektQueryParams;
  setFilters: (filters: ObjektQueryParams) => void;
}>;

export default function ObjektList({
  lockedTokenIds,
  showLocked,
  artists,
  filters,
  setFilters,
  className,
}: Props) {
  const { ref, inView } = useInView();

  async function fetchObjekts({ pageParam = 0 }) {
    const searchParams = new URLSearchParams({
      startAfter: pageParam.toString(),
      sort: filters.sort,
      artist: filters.artist ?? "",
      member: filters.member ?? "",
      classType: filters.classType ? filters.classType.join(",") : "",
      onlineType: filters.onlineType ? filters.onlineType.join(",") : "",
      season: filters.season ? filters.season.join(",") : "",
      transferable: filters.transferable ? "true" : "",
      gridable: filters.gridable ? "true" : "",
    });

    const result = await fetch(
      `/api/objekt/v1/owned-by/me?${searchParams.toString()}`
    );
    return (await result.json()) as OwnedObjektsResult;
  }

  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["objekts", filters],
    queryFn: fetchObjekts,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    refetchOnWindowFocus: false,
  });

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView]);

  // reset query upon filter change
  const refetchPage = useCallback(
    () => refetch({ refetchPage: (_, index) => index === 0 }),
    [refetch]
  );
  useEffect(() => {
    refetchPage();
  }, [filters, refetchPage]);

  function shouldShowObjekt(objekt: OwnedObjekt) {
    return showLocked
      ? true
      : lockedTokenIds.includes(parseInt(objekt.tokenId)) === false;
  }

  return (
    <RefetchObjektsContext.Provider value={refetchPage}>
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
                      {group.objekts.filter(shouldShowObjekt).map((objekt) => (
                        <Objekt
                          key={objekt.tokenId}
                          objekt={objekt}
                          showButtons={true}
                          lockedObjekts={lockedTokenIds}
                        />
                      ))}

                      {group.objekts.filter(shouldShowObjekt).length === 0 && (
                        <div className="col-span-full flex flex-col gap-2 items-center py-12">
                          <HeartCrack className="h-12 w-12" />
                          <p>No objekts found</p>
                        </div>
                      )}
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
    </RefetchObjektsContext.Provider>
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
      <p>There was an error loading your objekts</p>
    </div>
  );
}
