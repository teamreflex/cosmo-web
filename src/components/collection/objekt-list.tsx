"use client";

import { ObjektQueryParams, OwnedObjektsResult } from "@/lib/server/cosmo";
import Objekt from "./objekt";
import { Fragment, useEffect, useState } from "react";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "react-query";
import { useInView } from "react-intersection-observer";

export default function ObjektList() {
  const { ref, inView } = useInView();

  const [params, setParams] = useState<ObjektQueryParams>({
    startAfter: 0,
    sort: "newest",
    showLocked: true,
  });

  async function fetchObjekts({ pageParam = 0 }) {
    const searchParams = new URLSearchParams({
      startAfter: pageParam.toString(),
      sort: params.sort,
      showLocked: params.showLocked.toString(),
    });
    if (params.member) {
      searchParams.append("member", params.member);
    }
    if (params.artist) {
      searchParams.append("artist", params.artist);
    }

    const result = await fetch(
      `/api/objekt/v1/owned-by/me?${searchParams.toString()}`
    );
    return (await result.json()) as OwnedObjektsResult;
  }

  const {
    data,
    error,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery("objekts", fetchObjekts, {
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
  useEffect(() => {
    refetch({ refetchPage: (_, index) => index === 0 });
  }, [params]);

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {status === "loading" ? (
          <div className="flex col-span-3 py-12">
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
                    <div key={objekt.tokenId}>
                      <Objekt objekt={objekt} showButtons={true} />
                    </div>
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
    </>
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
    <div className="col-span-3 flex flex-col gap-2 items-center">
      <HeartCrack className="h-12 w-12" />
      <p>There was an error loading your objekts</p>
    </div>
  );
}
