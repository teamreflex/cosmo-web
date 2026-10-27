import { Error } from "@/components/error-boundary";
import MarketNotice from "@/components/market/market-notice";
import ListingDetail from "@/components/trade-listings/listing-detail";
import { ListingHeaderSkeleton } from "@/components/trade-listings/listing-header";
import { WantsSkeleton } from "@/components/trade-listings/listing-status";
import { SideHeadingSkeleton } from "@/components/trade-listings/side-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import {
  offeredTokenRefusalsQuery,
  rangeMatchCountQueries,
  tradeListingQuery,
  tradeListingViewerQuery,
} from "@/lib/queries/trade-listings";
import { sanitizeUuid } from "@/lib/universal/parsers";
import {
  listingSearchDefaults,
  listingSearchSchema,
  poolItems,
  publicListingPanel,
} from "@/lib/universal/trade-listings";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { IconHeartBroken } from "@tabler/icons-react";
import { noop } from "@tanstack/react-query";
import {
  createFileRoute,
  notFound,
  stripSearchParams,
} from "@tanstack/react-router";

export const Route = createFileRoute("/market/listing/$id")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  // the poster's open tab; Listing stays out of the URL, so the canonical address is the bare page
  validateSearch: listingSearchSchema,
  search: {
    middlewares: [stripSearchParams(listingSearchDefaults)],
  },
  loader: async ({ context, params, preload }) => {
    // discord users sometimes paste formatting onto the end of the URL
    const id = sanitizeUuid(params.id);
    if (!id) throw notFound();

    const [account, listing] = await Promise.all([
      context.queryClient.query({
        ...currentAccountQuery,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...tradeListingQuery(id),
        staleTime: "static",
      }),
    ]);
    if (!listing) throw notFound();

    const panel = publicListingPanel(
      listing,
      account && {
        userId: account.user.id,
        linked: account.cosmo !== undefined,
      },
    );

    // the poster's blocked listing names the objekts that block it
    if (
      listing.stop === "blocked" &&
      account?.cosmo &&
      listing.poster?.id === account.user.id
    ) {
      void context.queryClient
        .query(
          offeredTokenRefusalsQuery(
            poolItems(listing).map((item) => item.tokenId),
          ),
        )
        .catch(noop);
    }
    for (const query of rangeMatchCountQueries(
      listing.wants.flatMap((want) =>
        want.kind === "range" ? [want.filter] : [],
      ),
    )) {
      void context.queryClient.query(query).catch(noop);
    }

    /**
     * The viewer's side is awaited, so a navigation paints the listing once
     * instead of filling it in; a failed read is left to its error state. It
     * reads the viewer's holdings, so hovering a link never fetches it. An
     * ended listing asks only whether the viewer was a party to its trade.
     */
    if (
      !preload &&
      (panel.role === "viewer" || (panel.role === "closed" && account))
    ) {
      await context.queryClient
        .query(tradeListingViewerQuery(id, listing.updatedAt))
        .catch(noop);
    }

    return { id, account };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: m.listing_detail_title(),
      canonical: loaderData ? `/market/listing/${loaderData.id}` : undefined,
    }),
});

function RouteComponent() {
  const { id, account } = Route.useLoaderData();

  return (
    <main className="flex flex-col">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <MetadataDialogProvider>
          <ProfileProvider objektLists={account?.objektLists ?? []}>
            <ListingDetail id={id} />
          </ProfileProvider>
        </MetadataDialogProvider>
      </UserStateProvider>

      <MarketNotice />
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="flex flex-col">
      <ListingHeaderSkeleton />
      <div className="container grid grid-cols-[minmax(0,1fr)] gap-5 pt-5 pb-10 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] lg:gap-6 lg:pt-6">
        <div className="flex flex-col gap-4">
          <SideHeadingSkeleton />
          <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
            <div className="@container w-[120px] shrink-0 lg:w-full lg:max-w-45">
              <Skeleton className="aspect-photocard w-full rounded-photocard" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-3 lg:flex-col lg:gap-2">
          <span className="h-px flex-1 bg-border lg:hidden" />
          <Skeleton className="size-8 rounded-full lg:size-10" />
          <span className="h-px flex-1 bg-border lg:h-auto lg:w-px" />
        </div>
        <WantsSkeleton />
      </div>
    </main>
  );
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-sm font-semibold">
        {m.trade_error_listing_not_found()}
      </p>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.listing_detail_error()} />;
}
