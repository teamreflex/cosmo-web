"use client";

import { CosmoNewsFeedResult } from "@/lib/universal/cosmo/news";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { InView } from "react-intersection-observer";
import {
  QueryFunction,
  QueryKey,
  useInfiniteQuery,
} from "@tanstack/react-query";

type Props<TPostType> = {
  fetcher: QueryFunction<
    CosmoNewsFeedResult<TPostType>,
    QueryKey,
    string | number | undefined
  >;
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
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [queryKey, { artist }],
      queryFn: fetcher,
      initialPageParam: "0",
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      refetchOnWindowFocus: false,
    });

  function onInView(inView: boolean) {
    if (inView) fetchNextPage();
  }

  return (
    <div className="flex flex-col gap-8 justify-center w-full md:w-1/2">
      {status === "pending" ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-24 w-24" />
        </div>
      ) : status === "error" ? (
        <Error />
      ) : (
        data !== undefined &&
        data.pages.map((group, i) => (
          <div className="contents" key={i}>
            {group.results.map((post) => component(post))}
            {group.results.length === 0 && (
              <div className="col-span-full flex flex-col gap-2 items-center py-12">
                <HeartCrack className="h-12 w-12" />
                <p>No posts found</p>
              </div>
            )}
          </div>
        ))
      )}

      {status !== "error" && (
        <div className="flex justify-center py-6">
          <InView
            as="button"
            onChange={onInView}
            onClick={() => fetchNextPage()}
            disabled={!hasNextPage || isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loading />
            ) : hasNextPage ? (
              <LoadMore />
            ) : null}
          </InView>
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
