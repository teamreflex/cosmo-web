"use client";

import {
  CosmoRekordItem,
  CosmoRekordPost,
  RekordResponse,
} from "@/lib/universal/cosmo/rekord";
import {
  QueryFunction,
  QueryKey,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { Fragment, ReactNode } from "react";
import Skeleton from "../skeleton/skeleton";
import { cn } from "@/lib/utils";

type Props<TPostType extends CosmoRekordItem> = {
  gridClasses?: string;
  queryKey: QueryKey;
  queryFunction: QueryFunction<
    RekordResponse<TPostType>,
    QueryKey,
    number | undefined
  >;
  children: (props: { item: TPostType }) => ReactNode;
};

export default function RekordGrid<TPostType extends CosmoRekordItem>({
  gridClasses = "grid-cols-2 md:grid-cols-5 gap-4 justify-center",
  queryKey,
  queryFunction,
  children,
}: Props<TPostType>) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey,
      queryFn: queryFunction,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.fromPostId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    });

  const rekords = data?.pages.flatMap((group) => group.results) ?? [];

  return (
    <div className={cn("relative grid", gridClasses)}>
      {status === "pending" ? (
        <Fragment>
          <div className="z-20 absolute top-0 w-full h-full bg-linear-to-b from-transparent to-75% to-background" />
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="z-10 max-w-64 aspect-photocard" />
          ))}
        </Fragment>
      ) : status === "error" ? (
        <div className="col-span-full font-semibold text-sm text-center">
          Could not load rekords
        </div>
      ) : (
        <Fragment>
          {rekords.map((item) => (
            <Fragment key={item.post.id}>{children({ item })}</Fragment>
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
