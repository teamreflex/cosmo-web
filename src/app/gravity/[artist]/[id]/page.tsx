import { getArtistsWithMembers } from "@/app/data-fetching";
import GravityProvider from "@/components/gravity/gravity-provider";
import { fetchGravity, fetchPoll } from "@/lib/server/cosmo/gravity";
import { getProxiedToken } from "@/lib/server/handlers/withProxiedToken";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { isEqual } from "@/lib/utils";
import { isBefore } from "date-fns";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Metadata } from "next";
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

const data = cache(async (artist: string, id: number) => {
  return await fetchGravity(artist as ValidArtist, id);
});

type Props = {
  params: Promise<{
    artist: string;
    id: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const gravity = await data(params.artist, Number(params.id));
  if (!gravity) {
    notFound();
  }

  return {
    title: `${gravity.title}`,
  };
}

export default async function GravityPage(props: Props) {
  const params = await props.params;
  const [{ accessToken }, gravity] = await Promise.all([
    getProxiedToken(),
    data(params.artist, Number(params.id)),
  ]);
  if (!gravity) {
    notFound();
  }

  const isPolygon = isBefore(gravity.entireEndDate, "2025-04-18");
  const isSupported = gravity.pollType === "single-poll";
  const artists = getArtistsWithMembers();
  const artist = artists.find((a) => isEqual(a.id, params.artist));
  if (!artist) {
    notFound();
  }

  /**
   * abstract: kick off fetching of the poll details (candidates etc)
   */
  const queryClient = getQueryClient();
  if (isPolygon === false) {
    const { poll } = findPoll(gravity);
    queryClient.prefetchQuery({
      queryKey: pollDetailsKey({
        tokenId: BigInt(artist.comoTokenId),
        pollId: BigInt(poll.id),
      }),
      queryFn: async () =>
        fetchPoll(accessToken, artist.id, gravity.id, poll.id),
    });
  }

  return (
    <GravityProvider>
      <main className="container flex flex-col py-2">
        {/* header */}
        <div className="flex flex-col pb-4">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {gravity.title}
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
