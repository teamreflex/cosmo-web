import { Error } from "@/components/error-boundary";
import GravityHero from "@/components/gravity/gravity-hero";
import GravityList from "@/components/gravity/gravity-list";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { artistsQuery, selectedArtistsQuery } from "@/lib/queries/core";
import {
  activeGravitiesQuery,
  paginatedGravitiesQuery,
} from "@/lib/queries/gravity";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/gravity/")({
  loader: async ({ context }) => {
    const selected =
      await context.queryClient.ensureQueryData(selectedArtistsQuery);
    const artistsFilter = selected.length > 0 ? selected : undefined;

    // prefetch gravities
    void context.queryClient.prefetchQuery(activeGravitiesQuery(artistsFilter));
    void context.queryClient.prefetchInfiniteQuery(
      paginatedGravitiesQuery(artistsFilter),
    );

    const { artists } = await context.queryClient.ensureQueryData(artistsQuery);

    return { artists };
  },
  staleTime: 1000 * 60 * 15, // 15 minutes
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  head: () => defineHead({ title: m.gravity_header(), canonical: "/gravity" }),
});

function RouteComponent() {
  const { data: selected } = useSuspenseQuery(selectedArtistsQuery);
  const { artists } = Route.useLoaderData();

  const artistsFilter = selected.length > 0 ? selected : undefined;
  const { data: activeGravities } = useSuspenseQuery(
    activeGravitiesQuery(artistsFilter),
  );

  return (
    <main className="container flex flex-col gap-4 py-2">
      {/* Header */}
      <h1 className="font-cosmo text-3xl uppercase">{m.gravity_header()}</h1>

      {/* Active gravities hero */}
      <GravityHero gravities={activeGravities} artists={artists} />

      {/* Past gravities list */}
      <GravityList selectedArtists={artistsFilter} artists={artists} />

      <Overlay>
        <ScrollToTop />
      </Overlay>
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <h1 className="font-cosmo text-3xl uppercase">{m.gravity_header()}</h1>

      <div className="relative mt-4 flex flex-col gap-4">
        <SkeletonGradient />
        {/* Hero skeleton */}
        <Skeleton className="h-[180px] w-full rounded-xl" />
        {/* List skeleton */}
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.gravity_error_loading()} />;
}
