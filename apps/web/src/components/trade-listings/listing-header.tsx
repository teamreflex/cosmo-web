import { m } from "@/i18n/messages";
import { listingRatio } from "@/lib/client/trade-listings";
import type { TradeListing, TradeRatio } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import type { ReactNode } from "react";
import FeedbackBadge from "../feedback/feedback-badge";
import { PartyAvatar, PartyLink } from "../trades/trade-header";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";
import ListingStateBadge from "./listing-state-badge";

type Props = {
  listing: TradeListing;
  /** where the listing stands for this viewer, shown on every width */
  status?: ReactNode;
  /** what the viewer can do, from tablet width; phones show it in the bottom bar */
  actions?: ReactNode;
  /** the poster's tabs, along the header's foot */
  tabs?: ReactNode;
  /** the viewer posted it, so the line under the name says so in place of their rating */
  own?: boolean;
};

/**
 * Who posted the listing, as the page's heading, with its kind, state and
 * ratio and, under them, the poster's ratings and when they posted (on
 * their own listing, that it's theirs, when they posted and when it last
 * changed), with the viewer's status and actions at the far end. Phones
 * drop the kind beside a ratio, to leave the name room. The poster's tabs
 * run along its foot. From tablet width it sticks under the navbar, so
 * Accept and the tabs stay in reach.
 */
export default function ListingHeader({
  listing,
  status,
  actions,
  tabs,
  own = false,
}: Props) {
  const ratio = listingRatio(listing, listing.items.length);
  /**
   * An edit, or the drain dropping an objekt that left the poster, moves
   * `updated_at`. Posting sets it beside `created_at`, which keeps its
   * microseconds where `updated_at` rounds to the millisecond, so the two
   * can differ by a millisecond on a listing nothing has changed since.
   */
  const updated = listing.updatedAt.getTime() - listing.createdAt.getTime() > 1;
  const party = {
    user: listing.poster,
    cosmoUsername: listing.cosmoUsername,
    rep: listing.rep,
  };

  return (
    <div className="border-b border-border bg-background md:sticky md:top-14 md:z-20 md:bg-background/90 md:backdrop-blur-lg">
      {/* phones space the status by margin, so hidden actions leave no gap */}
      <div className="container flex flex-wrap items-center gap-x-8 py-3 md:py-3.5">
        {/* phones set the badges beside both lines, wider screens beside the name */}
        <div className="grid min-w-0 flex-1 basis-105 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 md:grid-cols-[auto_minmax(0,max-content)_1fr] md:gap-x-2.5">
          <PartyAvatar
            party={party}
            className="col-start-1 row-start-1 row-end-3 size-9 text-sm **:p-1.5 md:mr-1.5 md:size-10"
          />
          <h1 className="col-start-2 row-start-1 truncate text-base font-semibold">
            <PartyLink party={party} />
          </h1>
          <div className="col-start-3 row-start-1 row-end-3 flex gap-1.5 md:row-end-2">
            <Badge
              variant="outline"
              className={cn(
                "text-muted-foreground",
                ratio !== null && "max-md:hidden",
              )}
            >
              {m.listing_detail_kind_trade()}
            </Badge>
            <ListingStateBadge status={listing.state.status} />
            {ratio !== null && (
              <Badge
                variant="ghost"
                className="bg-cosmo/15 font-mono text-cosmo tabular-nums hover:bg-cosmo/15 dark:text-cosmo-text"
              >
                <RatioText ratio={ratio} />
              </Badge>
            )}
          </div>
          <p className="col-start-2 row-start-2 text-xs text-muted-foreground md:col-end-4 md:text-sm">
            {own ? (
              <>
                {m.listing_poster_yours()}
                {"\u00a0· "}
              </>
            ) : (
              listing.poster !== null && (
                <>
                  <FeedbackBadge
                    variant="full"
                    rep={listing.rep}
                    narrow
                    className="md:text-sm"
                  />
                  {"\u00a0· "}
                </>
              )
            )}
            <Timestamp
              date={listing.createdAt}
              relative="narrow"
              className="whitespace-nowrap md:hidden"
            />
            <span className="max-md:hidden">
              <ParaglideMessage
                message={m.listing_detail_posted}
                inputs={{ when: "" }}
                markup={{
                  time: () => (
                    <Timestamp date={listing.createdAt} relative="long" />
                  ),
                }}
              />
            </span>
            {own && updated && (
              <span className="max-md:hidden">
                {" · "}
                <ParaglideMessage
                  message={m.listing_detail_updated_at}
                  inputs={{ when: "" }}
                  markup={{
                    time: () => (
                      <Timestamp date={listing.updatedAt} relative="long" />
                    ),
                  }}
                />
              </span>
            )}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 max-md:*:mt-3 md:ml-auto">
          {status}
          {actions !== undefined && (
            <div className="flex flex-wrap gap-2 max-md:hidden">{actions}</div>
          )}
        </div>
      </div>
      {tabs !== undefined && (
        <div className="container no-scrollbar overflow-x-auto">{tabs}</div>
      )}
    </div>
  );
}

/**
 * A ratio as a pill shows it, "1 : 5", read out as "1 for 5".
 */
export function RatioText({ ratio }: { ratio: TradeRatio }) {
  return (
    <>
      <span aria-hidden>
        {ratio.give} : {ratio.get}
      </span>
      <span className="sr-only">{m.market_listings_ratio(ratio)}</span>
    </>
  );
}

export function ListingHeaderSkeleton() {
  return (
    <div className="border-b border-border">
      <div className="container flex flex-wrap items-center gap-x-8 gap-y-3 py-3 md:py-3.5">
        <div className="flex min-w-0 flex-1 basis-105 items-center gap-3 md:gap-4">
          <Skeleton className="size-9 shrink-0 rounded-full md:size-10" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-80 rounded-md" />
      </div>
    </div>
  );
}
