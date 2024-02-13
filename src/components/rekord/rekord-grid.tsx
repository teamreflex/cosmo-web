"use client";

import { CosmoRekordPost, RekordResponse } from "@/lib/universal/cosmo/rekord";
import {
  QueryFunction,
  QueryKey,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { Fragment, ReactNode, cloneElement } from "react";
import Skeleton from "../skeleton/skeleton";

type Props = {
  queryKey: QueryKey;
  queryFunction: QueryFunction<RekordResponse, QueryKey, number | undefined>;
  children: (props: { post: CosmoRekordPost }) => ReactNode;
};

export default function RekordGrid({
  queryKey,
  queryFunction,
  children,
}: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey,
      queryFn: queryFunction,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.fromPostId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    });

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-center">
      {status === "pending" ? (
        <Fragment>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="max-w-64 aspect-photocard" />
          ))}
        </Fragment>
      ) : status === "error" ? (
        <div>error</div>
      ) : (
        <Fragment>
          {data !== undefined &&
            data.pages.map((group, i) => (
              <Fragment key={i}>
                {group.results.map((post) => (
                  <Fragment key={post.id}>{children({ post })}</Fragment>
                ))}
              </Fragment>
            ))}

          {hasNextPage && (
            <div className="flex col-span-full justify-center">
              <InfiniteQueryNext
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                status={status}
              />
            </div>
          )}
        </Fragment>
      )}
    </div>
  );
}
