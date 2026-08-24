import { Error } from "@/components/error-boundary";
import GravityHeader, {
  GravityHeaderSkeleton,
} from "@/components/gravity/gravity-header";
import GravityPollTabs from "@/components/gravity/gravity-poll-tabs";
import GravitySkeleton from "@/components/gravity/gravity-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { $fetchGravityDetails } from "@/lib/functions/gravity";
import { defineHead } from "@/lib/meta";
import { gravityPollDetailsQuery } from "@/lib/queries/gravity";
import { IconAlertTriangle, IconHeartBroken } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import * as z from "zod";

// the chart pulls in recharts, so it stays out of the route bundle
const GravityLiveChart = lazy(
  () => import("@/components/gravity/abstract/gravity-live-chart"),
);

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
    const { artist, gravity, polls, defaultPollId } =
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
     * prefetch poll details (candidates etc) for the selected poll only.
     * vote data is deliberately not prefetched — the payload can be huge, so the client fetches it.
     */
    void context.queryClient.prefetchQuery(
      gravityPollDetailsQuery({
        artistName: params.artist,
        tokenId: artist.comoTokenId,
        gravityId: gravity.id,
        pollId,
      }),
    );

    return { artist, gravity, polls, pollId };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.gravity.title ?? m.gravity_header(),
      canonical: `/gravity/${loaderData?.artist?.id}/${loaderData?.gravity.id}`,
    }),
});

function RouteComponent() {
  const { artist, gravity, polls, pollId } = Route.useLoaderData();

  return (
    <>
      <GravityPollTabs polls={polls} gravity={gravity} pollId={pollId} />

      {/* gap-2 matches the chart component's own wrapper, so the fallbacks space the same way */}
      <main className="container flex flex-col gap-2 py-2">
        {/* the header carries live state, so it renders with the content it belongs to */}
        <ErrorBoundary
          fallback={
            <>
              <GravityHeader gravity={gravity} pollCount={polls.length} />
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <IconAlertTriangle className="size-12" />
                <p className="text-sm font-semibold">
                  {m.gravity_failed_load()}
                </p>
              </div>
            </>
          }
        >
          <Suspense
            fallback={
              <div className="flex flex-col gap-2">
                <GravityHeader
                  gravity={gravity}
                  pollCount={polls.length}
                  status={<Skeleton className="h-5 w-32 rounded-full" />}
                />
                <GravitySkeleton />
              </div>
            }
          >
            <GravityLiveChart
              artist={artist}
              gravity={gravity}
              pollCount={polls.length}
              pollId={pollId}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col gap-2 py-2">
      <GravityHeaderSkeleton />
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
