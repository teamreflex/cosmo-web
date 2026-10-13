import FiltersContainer from "@/components/collection/filters-container";
import { Error } from "@/components/error-boundary";
import MarketHeader from "@/components/market/market-header";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ListingFeed, {
  ListingFeedCount,
  ListingFeedSkeleton,
} from "@/components/trade-listings/listing-feed";
import ListingFeedFilters from "@/components/trade-listings/listing-feed-filters";
import ListingTypePicker from "@/components/trade-listings/listing-type-picker";
import NewListingButton from "@/components/trade-listings/new-listing-button";
import MyTradesButton from "@/components/trades/my-trades-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists } from "@/hooks/use-artists";
import { useListingFeedFilters } from "@/hooks/use-listing-feed-filters";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, selectedArtistsQuery } from "@/lib/queries/core";
import {
  listingFeedQuery,
  listingFeedTotalQuery,
} from "@/lib/queries/listing-feed";
import { listingFeedFrontendSchema } from "@/lib/universal/parsers";
import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/market/")({
  validateSearch: listingFeedFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ search }),
  /**
   * The navbar's artists live in the query cache rather than the URL, so
   * the feed's options take them when read.
   */
  context: ({ deps }) => ({
    listingFeedOptions: (artists: string[]) =>
      listingFeedQuery(deps.search, artists),
    listingFeedTotalOptions: (artists: string[]) =>
      listingFeedTotalQuery(deps.search, artists),
  }),
  loader: async ({ context }) => {
    const [, selected] = await Promise.all([
      context.queryClient.query({
        ...currentAccountQuery,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...selectedArtistsQuery,
        staleTime: "static",
      }),
    ]);

    void context.queryClient
      .infiniteQuery(context.listingFeedOptions(selected))
      .catch(noop);
    void context.queryClient
      .query(context.listingFeedTotalOptions(selected))
      .catch(noop);
  },
  head: () => defineHead({ title: m.market_header(), canonical: "/market" }),
});

function RouteComponent() {
  const { listingFeedOptions, listingFeedTotalOptions } =
    Route.useRouteContext();
  const { selectedIds } = useArtists();
  const { type, setType, count, reset } = useListingFeedFilters();
  const options = listingFeedOptions(selectedIds);

  return (
    <main className="relative flex w-full flex-col">
      <MarketHeader
        total={
          <ListingFeedCount
            options={listingFeedTotalOptions(selectedIds)}
            filtered={count > 0}
          />
        }
        actions={
          <>
            <ListingTypePicker value={type} onChange={setType} />
            <MyTradesButton />
            <NewListingButton />
          </>
        }
      />

      <FiltersContainer>
        <ListingFeedFilters />
      </FiltersContainer>

      <div className="container flex flex-col py-2">
        <ListingFeed options={options} filtered={count > 0} onReset={reset} />
      </div>

      <div id="pagination" />

      <Overlay>
        <ScrollToTop />
      </Overlay>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.market_listings_error()} />;
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <MarketHeader
        total={<Skeleton className="h-4 w-12" />}
        actions={
          <>
            <Skeleton className="h-9 w-28 md:h-8" />
            <Skeleton className="size-9 md:h-8 md:w-28" />
            <Skeleton className="h-9 w-28 md:h-8" />
          </>
        }
      />

      <div className="border-b border-border bg-muted/40">
        <div className="container flex flex-col gap-2 py-2">
          {Array.from({ length: 2 }).map((_, row) => (
            <div key={row} className="flex gap-2 max-md:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          ))}
          <Skeleton className="h-10 w-24 md:hidden" />
        </div>
      </div>

      <div className="container py-2">
        <ListingFeedSkeleton />
      </div>
    </div>
  );
}
