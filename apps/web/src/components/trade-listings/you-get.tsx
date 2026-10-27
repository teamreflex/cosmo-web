import type { Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import {
  availabilityLabel,
  objektName,
  posterName,
  standingLabel,
  standingNote,
  standingsSummary,
} from "@/lib/client/trade-listings";
import {
  type ListingItem,
  type ListingTrade,
  poolItems,
  poolStanding,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import SelectableCard, { OfferPill } from "./selectable-card";
import SideHeading, { SideHeadingSkeleton } from "./side-heading";

export type OfferedHeading = "you_get" | "offering" | "you_offer";

type Props = {
  listing: TradeListing;
  /** null while the server names a signed-in viewer's role */
  heading: OfferedHeading | null;
  /** the viewer's claim, whose pool picks the cards toggle unless it's a bundle */
  picks?: Picks | null;
  /** the poster's trades from the listing, which name who has each objekt under "You offer" */
  trades?: readonly ListingTrade[];
};

/**
 * What the listing offers, headed "You get" for a viewer on their own side
 * of the trade, "You offer" for its poster with how each objekt stands and
 * who has it, or "Offering". Objekts that can't be picked are dimmed with
 * why; a viewer choosing which pool objekts they get picks from a grid.
 */
export default function YouGet({
  listing,
  heading,
  picks = null,
  trades = [],
}: Props) {
  const poster = heading === "you_offer";
  const shown = listing.items.map((item) => {
    const standing = poster ? poolStanding(item, trades) : null;
    return {
      item,
      standing,
      label:
        standing === null
          ? availabilityLabel(item.availability)
          : standingLabel(standing),
      note: standing === null ? null : standingNote(standing),
    };
  });
  const [single] = shown;

  if (picks !== null && picks.ratio !== null) {
    return <PoolPicker listing={listing} picks={picks} />;
  }
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {heading === null ? (
        <SideHeadingSkeleton />
      ) : poster ? (
        <SideHeading
          tone="have"
          title={m.listing_detail_you_offer({ count: shown.length })}
          summary={standingsSummary(
            shown.flatMap((card) => card.standing ?? []),
          )}
        />
      ) : heading === "you_get" ? (
        <SideHeading
          tone="want"
          title={m.listing_detail_you_get({ count: poolItems(listing).length })}
          summary={m.listing_detail_you_get_summary({
            poster: posterName(listing),
          })}
        />
      ) : (
        <SideHeading
          tone="have"
          title={m.listing_detail_offering({ count: shown.length })}
          summary={standingsSummary(
            listing.items.map((item) => item.availability),
          )}
        />
      )}

      {single !== undefined && shown.length === 1 ? (
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
          <ItemCard
            item={single.item}
            label={single.label}
            className="w-[120px] shrink-0 lg:w-full lg:max-w-45"
          />
          <ItemCaption {...single} />
        </div>
      ) : (
        <ul className="flex gap-3 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:px-4 max-sm:pb-1 sm:flex-wrap lg:grid lg:grid-cols-[repeat(auto-fill,minmax(150px,180px))] lg:gap-4">
          {shown.map((card, index) => (
            <li
              // a token can leave the pool and come back in an edit
              key={`${index}:${card.item.tokenId}`}
              className="flex w-[88px] shrink-0 flex-col gap-1.5 sm:w-[104px] lg:w-auto lg:gap-2"
            >
              <ItemCard item={card.item} label={card.label} />
              <ItemCaption {...card} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The pool as the viewer picks which of it they get: a grid of cards,
 * three across on phones, where a free one toggles and the rest stay
 * greyed with why. The heading counts what this many units take.
 */
function PoolPicker({
  listing,
  picks,
}: {
  listing: TradeListing;
  picks: Picks;
}) {
  const picked = new Set(picks.offered);
  /**
   * The viewer's read of the pool is fresher than the listing's cached one:
   * an objekt it no longer has left the pool since, given in a trade or
   * gone from the poster, so it's unavailable whichever it was.
   */
  const fresh = new Map(
    picks.pool.map(({ tokenId, availability }) => [tokenId, availability]),
  );

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SideHeading
        tone="want"
        title={m.listing_detail_you_get({ count: picks.offeredCount })}
        summary={m.listing_detail_picked({
          picked: picks.offered.length,
          count: picks.offeredCount,
        })}
      />
      <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] lg:gap-4">
        {listing.items.map((item, index) => {
          const fresher =
            item.availability.kind === "traded"
              ? item.availability
              : fresh.get(item.tokenId);
          const unavailable =
            fresher === undefined
              ? m.listing_detail_pill_unavailable()
              : availabilityLabel(fresher);
          return (
            <li
              // a token can leave the pool and come back in an edit
              key={`${index}:${item.tokenId}`}
              className="flex min-w-0 flex-col gap-1.5 lg:gap-2"
            >
              {item.collection === null ? (
                <ItemCard item={item} label={unavailable} />
              ) : (
                <SelectableCard
                  collection={item.collection}
                  serial={item.serial ?? undefined}
                  picked={unavailable === null && picked.has(item.tokenId)}
                  blocked={unavailable}
                  full={false}
                  priority={index < 6}
                  onToggle={() => picks.toggleOffered(item.tokenId)}
                />
              )}
              <ItemCaption item={item} label={unavailable} compact />
            </li>
          );
        })}
      </ul>
      {picks.takesOffers && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {m.listing_detail_pool_offers_help({ poster: posterName(listing) })}
        </p>
      )}
    </section>
  );
}

// an offered objekt's card, dimmed under why it can't be picked
function ItemCard({
  item,
  label,
  className,
}: {
  item: ListingItem;
  label: string | null;
  className?: string;
}) {
  return (
    <div className={cn("@container relative", className)}>
      <div className={cn(label !== null && "opacity-40")}>
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
      {label !== null && <OfferPill tone="blocked">{label}</OfferPill>}
    </div>
  );
}

/**
 * The objekt's name and its serial; the name already implies the class.
 * One that can't be picked is dimmed like its card, and the poster reads
 * how it stands under it. Compact captions, under the small cards of a
 * multi-objekt listing, drop to the small size below desktop width.
 */
function ItemCaption({
  item,
  label = null,
  note = null,
  compact = false,
}: {
  item: ListingItem;
  label?: string | null;
  note?: string | null;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        compact ? "text-xs leading-snug lg:text-sm" : "text-sm",
        label !== null && "opacity-50",
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
      {note !== null && (
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "text-xxs lg:text-xs" : "text-xs",
          )}
        >
          {note}
        </span>
      )}
    </span>
  );
}
