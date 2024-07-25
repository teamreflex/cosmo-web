"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Fragment } from "react";
import { CosmoActivityBadgeResult } from "@/lib/universal/cosmo/activity/badges";
import {
  QueryErrorResetBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { HeartCrack, RefreshCcw } from "lucide-react";
import Skeleton from "../skeleton/skeleton";
import Image from "next/image";
import { Button } from "../ui/button";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Badge from "./badge";

type Props = {
  artist: ValidArtist;
};

export default function BadgeList({ artist }: Props) {
  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <h1 className="text-3xl font-cosmo uppercase">Badges</h1>
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 mx-auto">
        <Badges artist={artist} />
      </div>
    </main>
  );
}

type HistoryListProps = {
  artist: ValidArtist;
};

function Badges({ artist }: HistoryListProps) {
  // if i use useSuspenseQuery here, the URL fails to parse
  const { status, data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["activity-badges", artist],
      queryFn: async ({ pageParam = 1 }) => {
        return await ofetch<CosmoActivityBadgeResult>(
          "/api/bff/v1/activity/badge",
          {
            query: {
              artistName: artist,
              page: pageParam.toString(),
            },
          }
        );
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages, lastPageParam) =>
        lastPage.count === 30 ? lastPageParam + 1 : null,
    });

  const badges = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col w-full gap-2">
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <div className="grid grid-cols-2 gap-4">
            {status === "pending" && (
              <Fragment>
                <Skeleton className="w-full aspect-square" />
                <Skeleton className="w-full aspect-square" />
              </Fragment>
            )}

            {status === "error" && (
              <div className="col-span-full flex flex-col gap-2 items-center py-12">
                <div className="flex items-center gap-2">
                  <HeartCrack className="h-6 w-6" />
                  <p className="text-sm font-semibold">Error loading badges</p>
                </div>
                <Button variant="outline" onClick={reset}>
                  <RefreshCcw className="mr-2" /> Retry
                </Button>
              </div>
            )}

            {status === "success" && (
              <Fragment>
                {badges.length === 0 && (
                  <p className="col-span-full text-sm font-semibold mx-auto">
                    No badges found
                  </p>
                )}

                {badges.map((badge) => (
                  <Badge key={badge.hid} badge={badge} />
                ))}
              </Fragment>
            )}
          </div>
        )}
      </QueryErrorResetBoundary>

      <InfiniteQueryNext
        status={status}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
