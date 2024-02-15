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
    <div className={cn("grid", gridClasses)}>
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
