import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import TransfersRenderer, {
  TransfersSkeleton,
} from "@/components/transfers/transfers-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import {
  artistsQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import { transfersQuery } from "@/lib/queries/objekt-queries";
import { transfersFrontendSchema } from "@/lib/universal/parsers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/trades")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  validateSearch: transfersFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    void context.queryClient.prefetchQuery(filterDataQuery);

    const [target, selected] = await Promise.all([
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(artistsQuery),
    ]);

    void context.queryClient.prefetchInfiniteQuery(
      transfersQuery(target.cosmo.address, deps.searchParams, selected),
    );

    return { selected, cosmo: target.cosmo };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.cosmo
        ? m.trades_title_with_username({ username: loaderData.cosmo.username })
        : m.trades_title(),
      canonical: `/@${loaderData?.cosmo.username}/trades`,
    }),
});

function RouteComponent() {
  const { cosmo } = Route.useLoaderData();

  return (
    <section className="flex flex-col">
      <TransfersRenderer cosmo={cosmo} />

      <div id="pagination" />
    </section>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      {/* FiltersContainer */}
      <div className="flex flex-col gap-2 pb-1 sm:pb-2">
        <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
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
