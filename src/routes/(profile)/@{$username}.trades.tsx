import { createFileRoute } from "@tanstack/react-router";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import TransfersRenderer, {
  TransfersSkeleton,
} from "@/components/transfers/transfers-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { transfersFrontendSchema } from "@/lib/universal/parsers";
import { seoTitle } from "@/lib/seo";
import {
  artistsQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import { ArtistProvider } from "@/hooks/use-artists";
import { transfersQuery } from "@/lib/queries/objekt-queries";

export const Route = createFileRoute("/(profile)/@{$username}/trades")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  validateSearch: transfersFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    context.queryClient.prefetchQuery(filterDataQuery);

    const [artists, selected, target] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
    ]);

    context.queryClient.prefetchInfiniteQuery(
      transfersQuery(target.cosmo.address, deps.searchParams, selected),
    );

    return { artists, selected, cosmo: target.cosmo };
  },
  head: ({ loaderData }) => ({
    meta: [
      seoTitle(
        loaderData?.cosmo ? `${loaderData.cosmo.username}'s Trades` : `Trades`,
      ),
    ],
  }),
});

function RouteComponent() {
  const { artists, selected, cosmo } = Route.useLoaderData();

  return (
    <section className="flex flex-col">
      <ArtistProvider artists={artists} selected={selected}>
        <TransfersRenderer cosmo={cosmo} />
      </ArtistProvider>

      <div id="pagination" />
    </section>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      {/* FiltersContainer */}
      <div className="flex flex-col gap-2 sm:pb-2 pb-1">
        <div className="sm:flex gap-2 items-center flex-wrap justify-center hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-9" />
          ))}
        </div>
      </div>

      <MemberFilterSkeleton />

      <div className="pt-2">
        <TransfersSkeleton />
      </div>
    </div>
  );
}
