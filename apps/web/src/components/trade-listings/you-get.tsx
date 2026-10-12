import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { objektName, posterName } from "@/lib/client/trade-listings";
import type {
  ListingFeedItem,
  TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import SideHeading, { SideHeadingSkeleton } from "./side-heading";

export type OfferedHeading = "you_get" | "offering";

type Props = {
  listing: TradeListing;
  /** null while the server names a signed-in viewer's role */
  heading: OfferedHeading | null;
};

/**
 * What the listing offers: headed "You get" in the want colour for a viewer
 * on their own side of the trade, or "Offering" in the have colour as the
 * feed and the composer show it. A single objekt sits beside its name below
 * desktop width and above it on desktop; several make a strip of small
 * cards on phones, a compact block on tablets and a grid on desktop. Cards
 * are at most 180px wide.
 */
export default function YouGet({ listing, heading }: Props) {
  const { items } = listing;
  const [single] = items;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {heading === null ? (
        <SideHeadingSkeleton />
      ) : heading === "you_get" ? (
        <SideHeading
          tone="want"
          title={m.listing_detail_you_get({ count: items.length })}
          summary={m.listing_detail_you_get_summary({
            poster: posterName(listing),
          })}
        />
      ) : (
        <SideHeading
          tone="have"
          title={m.listing_detail_offering({ count: items.length })}
          summary={m.market_listings_objekts({ count: items.length })}
        />
      )}

      {single !== undefined && items.length === 1 ? (
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
          <ItemCard
            item={single}
            className="w-[120px] shrink-0 lg:w-full lg:max-w-45"
          />
          <ItemCaption item={single} />
        </div>
      ) : (
        <ul className="flex gap-3 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:px-4 max-sm:pb-1 sm:flex-wrap lg:grid lg:grid-cols-[repeat(auto-fill,minmax(150px,180px))] lg:gap-4">
          {items.map((item) => (
            <li
              key={item.tokenId}
              className="flex w-[88px] shrink-0 flex-col gap-1.5 sm:w-[104px] lg:w-auto lg:gap-2"
            >
              <ItemCard item={item} />
              <ItemCaption item={item} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemCard({
  item,
  className,
}: {
  item: ListingFeedItem;
  className?: string;
}) {
  return (
    <div className={className}>
      {item.collection === null ? (
        <div className="@container">
          <div className="aspect-photocard rounded-photocard bg-muted" />
        </div>
      ) : (
        <ExpandableObjekt collection={item.collection}>
          <ObjektSidebar
            collection={item.collection}
            serial={item.serial ?? undefined}
          />
        </ExpandableObjekt>
      )}
    </div>
  );
}

/**
 * The objekt's name and its serial; the name already implies the class.
 * Compact captions, under the small cards of a multi-objekt listing, drop to
 * the small size below desktop width.
 */
function ItemCaption({
  item,
  compact = false,
}: {
  item: ListingFeedItem;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        compact ? "text-xs leading-snug lg:text-sm" : "text-sm",
      )}
    >
      <span className="font-semibold break-words">
        {objektName(item.collection, item.attributes)}
      </span>
      {item.serial !== null && (
        <span
          className={cn(
            "font-mono text-muted-foreground tabular-nums",
            compact ? "truncate text-xxs lg:text-xs" : "text-xs",
          )}
        >
          {formatSerial(item.serial)}
        </span>
      )}
    </span>
  );
}
