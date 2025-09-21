import { getArtistsWithMembers } from "@/data-fetching";
import GravityProvider from "@/components/gravity/gravity-provider";
import { isEqual } from "@/lib/utils";
import { isBefore } from "date-fns";
import { AlertCircle, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import AbstractLiveChart from "@/components/gravity/abstract/gravity-live-chart";
import PolygonLiveChart from "@/components/gravity/polygon/gravity-live-chart";
import { getQueryClient } from "@/lib/query-client";
import { pollDetailsKey } from "@/lib/client/gravity/common";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { findPoll } from "@/lib/client/gravity/util";
import GravitySkeleton from "@/components/gravity/gravity-skeleton";
import { db } from "@/lib/server/db";
import { fetchCachedGravity, fetchCachedPoll } from "@/lib/server/gravity";

// if polygon, could be slow
export const maxDuration = 30;

type Props = {
  params: Promise<{
    artist: string;
    id: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const gravity = await getGravity(params.artist, Number(params.id));
  if (!gravity) {
    notFound();
  }

  return {
    title: `${gravity.title}`,
  };
}

export default async function GravityPage(props: Props) {
  const params = await props.params;

  // use the database as a quick info check for metadata
  const info = await getGravity(params.artist, Number(params.id));
  if (!info) {
    notFound();
  }

  // TODO: support combination polls
  if (info.pollType === "combination-poll") {
    return (
      <p className="text-sm font-semibold">
        Combination poll support is not available yet.
      </p>
    );
  }

  const queryClient = getQueryClient();
  const isPast = isBefore(info.endDate, Date.now());
  const isPolygon = isBefore(info.endDate, "2025-04-18");
  const isSupported = info.pollType === "single-poll";
  const artists = getArtistsWithMembers();
  const artist = artists.find((a) => isEqual(a.id, params.artist));
  if (!artist) {
    notFound();
  }

  // fetch the full gravity from cosmo or cache, depending on timing
  const gravity = await fetchCachedGravity(artist.id, info.cosmoId, isPast);
  if (!gravity) {
    notFound();
  }

  // pull the correct poll from the gravity
  const { poll } = findPoll(gravity);

  /**
   * abstract: prefetch poll details (candidates etc)
   */
  if (isPolygon === false) {
    queryClient.prefetchQuery({
      queryKey: pollDetailsKey({
        tokenId: BigInt(artist.comoTokenId),
        pollId: BigInt(poll.id),
      }),
      queryFn: () => fetchCachedPoll(artist.id, info.cosmoId, poll.id, isPast),
    });
  }

  return (
    <GravityProvider>
      <main className="container flex flex-col py-2">
        {/* header */}
        <div className="flex flex-col pb-4">
          <div className="flex items-center gap-2 justify-between">
            <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
            <div id="gravity-status"></div>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {info.title}
          </p>
        </div>

        {/* content */}
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ErrorBoundary
            fallback={
              <div className="flex flex-col gap-2 justify-center items-center py-4">
                <AlertTriangle className="size-12" />
                <p className="text-sm font-semibold">
                  Failed to load live data. Please try again later.
                </p>
              </div>
            }
          >
            <Suspense fallback={<GravitySkeleton />}>
              {isSupported ? (
                isPolygon ? (
                  <PolygonLiveChart artist={artist} gravity={gravity} />
                ) : (
                  <AbstractLiveChart artist={artist} gravity={gravity} />
                )
              ) : (
                <div className="flex flex-col gap-2 justify-center items-center py-4">
                  <AlertCircle className="size-12" />
                  <p className="text-sm font-semibold">
                    Tracking is not supported for combination polls.
                  </p>
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        </HydrationBoundary>
      </main>
    </GravityProvider>
  );
}

const getGravity = cache(async (artist: string, id: number) => {
  return await db.query.gravities.findFirst({
    where: {
      artist,
      cosmoId: id,
    },
  });
});
