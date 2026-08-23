import { Error } from "@/components/error-boundary";
import DynamicLiveChart from "@/components/gravity/dynamic-live-chart";
import GravitySkeleton from "@/components/gravity/gravity-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { $fetchGravityDetails } from "@/lib/functions/gravity";
import { defineHead } from "@/lib/meta";
import { gravityPollDetailsQuery } from "@/lib/queries/gravity";
import { IconAlertTriangle, IconHeartBroken } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import * as z from "zod";

const gravitySearchSchema = z.object({
  // COSMO poll id, selecting one day of a multi-poll gravity
  poll: z.coerce.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute("/gravity/$artist/$id")({
  staleTime: Infinity,
  preloadStaleTime: 30_000, // loader calls $fetchGravityDetails outside query
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  validateSearch: gravitySearchSchema,
  loaderDeps: ({ search }) => ({ poll: search.poll }),
  loader: async ({ context, params, deps }) => {
    // fetch everything in one round trip
    const { artist, gravity, polls, defaultPollId, isPolygon } =
      await $fetchGravityDetails({
        data: {
          artist: params.artist,
          id: Number(params.id),
        },
      });

    // a poll param that doesn't belong to this gravity falls back to the default
    const pollId =
      polls.find((poll) => poll.cosmoId === deps.poll)?.cosmoId ??
      defaultPollId;

    /**
     * abstract: prefetch poll details (candidates etc) for the selected poll only.
     * vote data is deliberately not prefetched — the payload can be huge, so the client fetches it.
     */
    if (isPolygon === false) {
      void context.queryClient.prefetchQuery(
        gravityPollDetailsQuery({
          artistName: params.artist,
          tokenId: artist.comoTokenId,
          gravityId: gravity.id,
          pollId,
        }),
      );
    }

    /**
     * polygon: no prefetching as it's a lot of data,
     * just let the client fetch from CDN
     */

    return { artist, gravity, isPolygon, polls, pollId };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.gravity.title ?? m.gravity_header(),
      canonical: `/gravity/${loaderData?.artist?.id}/${loaderData?.gravity.id}`,
    }),
});

function RouteComponent() {
  const { artist, gravity, isPolygon, pollId } = Route.useLoaderData();

  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-cosmo text-3xl uppercase">
            {m.gravity_header()}
          </h1>
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
            <IconAlertTriangle className="size-12" />
            <p className="text-sm font-semibold">{m.gravity_failed_load()}</p>
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
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="font-cosmo text-3xl uppercase">{m.gravity_header()}</h1>
        <Skeleton className="h-5 w-56 rounded-full" />
      </div>

      {/* content */}
      <GravitySkeleton />
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.gravity_error_loading_details()} />;
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.gravity_not_found()}</p>
    </main>
  );
}
