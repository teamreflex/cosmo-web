"use client";

import { CosmoNewsFeedResult } from "@/lib/server/cosmo";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import { Fragment, ReactNode, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "react-query";

type Props<TPostType> = {
  fetcher: ({ pageParam = 0 }) => Promise<CosmoNewsFeedResult<TPostType>>;
  component: (post: TPostType) => ReactNode;
  queryKey: string;
  artist: string;
};

export default function NewsInfiniteLoader<TPostType>({
  fetcher,
  component,
  queryKey,
  artist,
}: Props<TPostType>) {
  const { ref, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [queryKey, { artist }],
      queryFn: fetcher,
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      refetchOnWindowFocus: false,
    });

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  return (
    <div className="flex flex-col gap-8 justify-center w-full md:w-1/2">
      {status === "loading" ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-24 w-24" />
        </div>
      ) : status === "error" ? (
        <Error />
      ) : (
        <>
          {data !== undefined &&
            data.pages.map((group, i) => (
              <Fragment key={i}>
                {group.results.map((post) => component(post))}
                {group.results.length === 0 && (
                  <div className="col-span-full flex flex-col gap-2 items-center py-12">
                    <HeartCrack className="h-12 w-12" />
                    <p>No posts found</p>
                  </div>
                )}
              </Fragment>
            ))}
        </>
      )}

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
      <p>There was an error loading more posts</p>
    </div>
  );
}