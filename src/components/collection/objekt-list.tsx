"use client";

import Objekt from "./objekt";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "react-query";
import { useInView } from "react-intersection-observer";
import MemberFilter from "./member-filter";
import { PropsWithClassName, cn } from "@/lib/utils";
import { LockedObjektContext } from "@/context/objekt";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import {
  COSMO_ENDPOINT,
  CosmoArtistWithMembers,
  OwnedObjekt,
  OwnedObjektsResult,
} from "@/lib/universal/cosmo";
import {
  CollectionFilters,
  collectionFilters,
} from "@/hooks/use-collection-filters";

type Props = PropsWithClassName<{
  authenticated: boolean;
  address: string;
  lockedTokenIds: number[];
  showLocked: boolean;
  artists: CosmoArtistWithMembers[];
  filters: CollectionFilters;
  setFilters: (filters: CollectionFilters) => void;
}>;

export default function ObjektList({
  authenticated,
  address,
  lockedTokenIds,
  showLocked,
  artists,
  filters,
  setFilters,
  className,
}: Props) {
  const { ref, inView } = useInView();
  const [lockedTokens, setLockedTokens] = useState<number[]>(lockedTokenIds);

  function onTokenLock(tokenId: number) {
    if (lockedTokens.includes(tokenId)) {
      setLockedTokens((prev) => prev.filter((id) => id !== tokenId));
    } else {
      setLockedTokens((prev) => [...prev, tokenId]);
    }
  }

  async function fetchObjekts({ pageParam = 0 }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      true,
      ["show_locked"]
    );
    searchParams.set("start_after", pageParam.toString());

    const result = await fetch(
      `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${searchParams.toString()}`
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
    queryKey: [`objekts::${address}`, filters],
    queryFn: fetchObjekts,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
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

  function shouldShowObjekt(objekt: OwnedObjekt) {
    return showLocked
      ? true
      : lockedTokens.includes(parseInt(objekt.tokenId)) === false;
  }

  return (
    <LockedObjektContext.Provider
      value={{
        lockedObjekts: lockedTokens,
        lockObjekt: onTokenLock,
      }}
    >
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
                          authenticated={authenticated}
                        />
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
    </LockedObjektContext.Provider>
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
