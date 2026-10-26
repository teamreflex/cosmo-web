import { m } from "@/i18n/messages";
import type { TradeListing } from "@/lib/universal/trade-listings";
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
};

/**
 * Who posted the listing, as the page's heading, with its kind and state
 * and, under them, the poster's ratings and when they posted, with the
 * viewer's status and actions at the far end. From tablet width it sticks
 * under the navbar, so Accept stays in reach while the viewer picks.
 */
export default function ListingHeader({ listing, status, actions }: Props) {
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
            <Badge variant="outline" className="text-muted-foreground">
              {m.listing_detail_kind_trade()}
            </Badge>
            <ListingStateBadge status={listing.state.status} />
          </div>
          <p className="col-start-2 row-start-2 text-xs text-muted-foreground md:col-end-4 md:text-sm">
            {listing.poster !== null && (
              <>
                <FeedbackBadge
                  variant="full"
                  rep={listing.rep}
                  narrow
                  className="md:text-sm"
                />
                {"\u00a0· "}
              </>
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
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 max-md:*:mt-3 md:ml-auto">
          {status}
          {actions !== undefined && (
            <div className="flex flex-wrap gap-2 max-md:hidden">{actions}</div>
          )}
        </div>
      </div>
    </div>
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
