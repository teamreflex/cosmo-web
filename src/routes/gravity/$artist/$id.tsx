import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, HeartCrack } from "lucide-react";
import { Suspense } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import GravitySkeleton from "@/components/gravity/gravity-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import GravityProvider from "@/components/gravity/gravity-provider";
import { fetchGravityDetails } from "@/lib/server/gravity";
import { seoTitle } from "@/lib/seo";
import { GravityNotSupportedError } from "@/lib/universal/gravity";
import { Error } from "@/components/error-boundary";
import { gravityPollDetailsQuery } from "@/lib/queries/gravity";
import DynamicLiveChart from "@/components/gravity/dynamic-live-chart";

export const Route = createFileRoute("/gravity/$artist/$id")({
  staleTime: Infinity,
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  loader: async ({ context, params }) => {
    // fetch everything in one round trip
    const { artist, gravity, poll, isPolygon } = await fetchGravityDetails({
      data: {
        artist: params.artist,
        id: Number(params.id),
      },
    });

    /**
     * abstract: prefetch poll details (candidates etc)
     */
    if (isPolygon === false) {
      context.queryClient.prefetchQuery(
        gravityPollDetailsQuery({
          artistName: params.artist,
          tokenId: BigInt(artist.comoTokenId),
          gravityId: gravity.id,
          pollId: poll.id,
        }),
      );
    }

    /**
     * polygon: no prefetching as it's a lot of data,
     * just let the client fetch from CDN
     */

    return { artist, gravity, isPolygon, pollId: poll.id };
  },
  head: ({ loaderData }) => ({
    meta: [seoTitle(loaderData?.gravity.title ?? `Gravity`)],
  }),
});

function RouteComponent() {
  const { artist, gravity, isPolygon, pollId } = Route.useLoaderData();

  return (
    <GravityProvider>
      <main className="container flex flex-col py-2">
        {/* header */}
        <div className="flex flex-col pb-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-cosmo text-3xl uppercase">Gravity</h1>
            <div id="gravity-status"></div>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {gravity.title}
          </p>
        </div>

        {/* content */}
        <ErrorBoundary
          fallback={
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <AlertTriangle className="size-12" />
              <p className="text-sm font-semibold">
                Failed to load live data. Please try again later.
              </p>
            </div>
          }
        >
          <Suspense fallback={<GravitySkeleton />}>
            {/* dynamically load the appropriate component at runtime */}
            <DynamicLiveChart
              network={isPolygon ? "polygon" : "abstract"}
              artist={artist}
              gravity={gravity}
              pollId={pollId}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </GravityProvider>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="font-cosmo text-3xl uppercase">Gravity</h1>
        <Skeleton className="h-5 w-56 rounded-full" />
      </div>

      {/* content */}
      <GravitySkeleton />
    </main>
  );
}

function ErrorComponent({ error }: ErrorComponentProps) {
  if (error.name === GravityNotSupportedError.name) {
    return <Error message="Combination poll support is not available yet." />;
  }
  return <Error message="Could not load gravity" />;
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-sm font-semibold">Gravity not found</p>
    </main>
  );
}
