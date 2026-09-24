import FiltersContainer from "@/components/collection/filters-container";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import TransfersRenderer, {
  TransfersSkeleton,
} from "@/components/transfers/transfers-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { selectedArtistsQuery } from "@/lib/queries/core";
import { transfersQuery } from "@/lib/queries/objekt-queries";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { transfersFrontendSchema } from "@/lib/universal/parsers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/trades")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  validateSearch: transfersFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, deps }) => {
    const [target, selected] = await Promise.all([
      context.queryClient.ensureQueryData(context.targetAccountOptions),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
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
      canonical:
        loaderData && `/@${profileIdentifier(loaderData.cosmo)}/trades`,
    }),
});

function RouteComponent() {
  const { cosmo } = Route.useLoaderData();

  return (
    <section className="flex flex-col">
      <TransfersRenderer cosmo={cosmo} />

      <Overlay>
        <ScrollToTop />
      </Overlay>

      <div id="pagination" />
    </section>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <FiltersContainer>
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </FiltersContainer>

      <div className="container flex flex-col">
        <div className="pt-2">
          <TransfersSkeleton />
        </div>
      </div>
    </div>
  );
}
