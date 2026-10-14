import { m } from "@/i18n/messages";
import { posterName } from "@/lib/client/trade-listings";
import type { TradeListing } from "@/lib/universal/trade-listings";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import UserAvatar from "../profile/user-avatar";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";
import ListingStateBadge from "./listing-state-badge";

type Props = {
  listing: TradeListing;
};

type HeaderProps = Props & {
  /** where the listing stands for this viewer, shown on every width */
  status?: ReactNode;
  /** what the viewer can do, from tablet width; phones show it in the bottom bar */
  actions?: ReactNode;
};

/**
 * The page title, who posted the listing and when, and the listing's state
 * beside their note, with the viewer's status and actions at the far end. From tablet
 * width it sticks under the navbar, so Accept stays in reach while the
 * viewer picks; a long note scrolls inside it rather than growing it.
 */
export default function ListingHeader({
  listing,
  status,
  actions,
}: HeaderProps) {
  return (
    <div className="border-b border-border bg-background md:sticky md:top-14 md:z-20 md:bg-background/90 md:backdrop-blur-lg">
      {/* phones space the status by margin, so hidden actions leave no gap */}
      <div className="container flex flex-wrap items-center gap-x-8 py-3 md:gap-y-3 md:py-4">
        <div className="flex min-w-0 flex-1 basis-105 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
              {m.listing_detail_title()}
            </h1>
            <PosterLine listing={listing} />
            <span className="text-xs text-muted-foreground">
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
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <ListingStateBadge status={listing.state.status} />
            {listing.note !== null && (
              <p
                dir="auto"
                className="max-w-prose min-w-0 text-sm break-words whitespace-pre-line text-muted-foreground md:max-h-15 md:overflow-y-auto"
              >
                {listing.note}
              </p>
            )}
          </div>
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

function PosterLine({ listing }: Props) {
  const name = posterName(listing);

  return (
    <span className="flex min-w-0 items-center gap-2">
      {listing.poster === null ? (
        <UserAvatar deleted className="size-7" />
      ) : (
        <UserAvatar
          username={listing.cosmoUsername ?? listing.poster.username}
          className="size-7 text-xs **:p-1"
        />
      )}
      {listing.cosmoUsername === null ? (
        <span className="truncate text-sm font-semibold">{name}</span>
      ) : (
        <Link
          to="/@{$username}"
          params={{ username: listing.cosmoUsername }}
          className="truncate text-sm font-semibold underline-offset-4 hover:underline"
        >
          {name}
        </Link>
      )}
    </span>
  );
}

export function ListingHeaderSkeleton() {
  return (
    <div className="border-b border-border">
      <div className="container flex flex-wrap items-center gap-x-8 gap-y-3 py-3 md:py-4">
        <div className="flex flex-1 basis-105 flex-wrap items-center gap-3">
          <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
            {m.listing_detail_title()}
          </h1>
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-full max-w-80 rounded-md" />
      </div>
    </div>
  );
}
