"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import { CosmoActivityBadgeResult } from "@/lib/universal/cosmo/activity/badges";
import {
  QueryErrorResetBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { HeartCrack, RefreshCcw } from "lucide-react";
import Skeleton from "../skeleton/skeleton";
import { Button } from "../ui/button";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Badge from "./badge";
import { match } from "ts-pattern";
import SkeletonGradient from "../skeleton/skeleton-overlay";

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
      <div className="flex w-full sm:w-2/3 md:w-1/2 mx-auto">
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
        return await ofetch<CosmoActivityBadgeResult>("/api/bff/v3/badges", {
          query: {
            artistName: artist,
            page: pageParam.toString(),
            lang: "en",
          },
        });
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages, lastPageParam) =>
        lastPage.count === 30 ? lastPageParam + 1 : null,
    });

  const badges = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col w-full gap-2">
      <QueryErrorResetBoundary>
        {({ reset }) => {
          return match(status)
            .with("pending", () => <BadgeSkeleton />)
            .with("error", () => (
              <div className="w-full flex flex-col gap-2 items-center py-12">
                <div className="flex items-center gap-2">
                  <HeartCrack className="h-6 w-6" />
                  <p className="text-sm font-semibold">Error loading badges</p>
                </div>
                <Button variant="outline" onClick={reset}>
                  <RefreshCcw className="mr-2" /> Retry
                </Button>
              </div>
            ))
            .with("success", () => (
              <div className="flex flex-col gap-4">
                {badges.length === 0 && (
                  <p className="text-sm font-semibold mx-auto">
                    No badges found
                  </p>
                )}

                {badges.map((badge) => (
                  <Badge key={badge.hid} badge={badge} />
                ))}
              </div>
            ))
            .exhaustive();
        }}
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

export function BadgeSkeleton() {
  return (
    <div className="relative w-full flex flex-col gap-4">
      <SkeletonGradient />

      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center h-24 w-full">
          <Skeleton className="h-full aspect-square" />

          <div className="flex flex-col w-full gap-3 sm:gap-1">
            <Skeleton className="h-5 lg:h-5 w-48 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
