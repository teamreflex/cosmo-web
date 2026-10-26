import type { PickerRow, Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { formatCount, pickShown, wantScope } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import type {
  CandidateRow,
  ListingPick,
  ListingViewer,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { takesOffers } from "@apollo/trades/lifecycle";
import { IconCircleCheck, IconPlus } from "@tabler/icons-react";
import { Fragment, type ReactNode, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { OfferedCaption, OfferedTile } from "./composer-offered";
import { RangeBadges } from "./range-want";
import RowPicker from "./row-picker";
import SideHeading, { SideHeadingSkeleton } from "./side-heading";
import WantLabel from "./want-label";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

type Props = {
  viewer: Candidate;
  /**
   * The viewer's linked COSMO address, whose collection the row pickers
   * list. A viewer who can pick is always linked.
   */
  address: string | undefined;
  rows: PickerRow[];
  picks: Picks;
  /** the poster as the page names them */
  poster: string;
};

/**
 * What the viewer would give, one panel of slots per want row at the
 * claim's size, filled from the server's picks. Removing a pick empties its
 * slot, and an empty slot opens the viewer's collection held to that row.
 * Accept, or Send offer, lives in the page header, which says whether the
 * picks fit.
 */
export default function AllocationPicker({
  viewer,
  address,
  rows,
  picks,
  poster,
}: Props) {
  const [picking, setPicking] = useState<number | null>(null);
  const { picked } = picks;

  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      <SideHeading
        tone="have"
        title={m.listing_detail_you_give_total({ count: picks.giveTotal })}
        summary={
          picks.takesOffers
            ? m.listing_detail_you_give_offer_summary()
            : m.listing_detail_you_give_summary()
        }
      />

      {rows.map((row, index) => {
        const rowPicks = picked[index] ?? [];
        const count = picks.wants[index]?.count ?? 0;
        return (
          <Fragment key={index}>
            <WantRow
              row={row}
              count={count}
              side={viewer.rows[index]}
              picked={rowPicks}
              onPick={() => setPicking(index)}
              onRemove={(pick) => picks.toggle(index, pick)}
            />
            {address !== undefined && row.want.kind !== "payment" && (
              <RowPicker
                address={address}
                label={<RowLabel row={row} count={count} />}
                scope={wantScope(row.want)}
                count={count}
                picked={rowPicks}
                elsewhere={
                  new Set(
                    picked.flatMap((other, otherIndex) =>
                      otherIndex === index
                        ? []
                        : other.map((pick) => pick.tokenId),
                    ),
                  )
                }
                open={picking === index}
                onOpenChange={(open) => setPicking(open ? index : null)}
                onToggle={(pick) => picks.toggle(index, pick)}
              />
            )}
          </Fragment>
        );
      })}

      <PickerFooter offers={picks.takesOffers} poster={poster} />
    </section>
  );
}

/**
 * The picker's shape while the viewer's objekts load: each row's frame,
 * label and footer around placeholder slots, so nothing grows when the
 * picks arrive.
 */
export function AllocationPickerSkeleton({
  rows,
  poster,
}: {
  rows: PickerRow[];
  poster: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      <SideHeadingSkeleton />

      {rows.map((row, index) => (
        <RowFrame
          key={index}
          header={<RowLabel row={row} count={row.trade.count} />}
          footer={<Skeleton className="ml-auto h-4 w-20" />}
        >
          {Array.from({ length: row.trade.count }, (_, slot) => (
            <li key={slot} className={slotClass}>
              <Skeleton className="aspect-photocard w-full rounded-photocard" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </li>
          ))}
        </RowFrame>
      ))}

      <PickerFooter
        offers={takesOffers(rows.map((row) => row.trade))}
        poster={poster}
      />
    </section>
  );
}

/**
 * What accepting does, or what sending an offer does on a listing that
 * takes offers.
 */
function PickerFooter({ offers, poster }: { offers: boolean; poster: string }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {offers
        ? m.listing_detail_offer_footer({ poster, appName: env.VITE_APP_NAME })
        : m.listing_detail_accept_footer({ appName: env.VITE_APP_NAME })}
    </p>
  );
}

// a slot, as wide as the composer's offered objekts
const slotClass = "@container flex w-[84px] flex-col gap-1.5 md:w-30";

// a want row as the picker heads it, at the claim's count
function RowLabel({ row, count }: { row: PickerRow; count: number }) {
  return row.want.kind === "range" ? (
    <RangeBadges count={count} filter={row.want.filter} matches={false} />
  ) : (
    <WantLabel
      want={row.want.kind === "payment" ? row.want : { ...row.want, count }}
    />
  );
}

function RowFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-clip rounded-lg border border-teal-500/30">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-border/60 px-4 py-3 text-sm">
        {header}
      </div>
      <ul className="flex flex-wrap items-start gap-3 px-4 py-3.5">
        {children}
      </ul>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        {footer}
      </div>
    </div>
  );
}

type WantRowProps = {
  row: PickerRow;
  // how many the row asks for at the claim's size
  count: number;
  side: CandidateRow | undefined;
  picked: ListingPick[];
  onPick: () => void;
  onRemove: (pick: ListingPick) => void;
};

/**
 * A want row's slots: its picks, then a slot that opens the picker for each
 * copy still to pick, then a dashed one for each the viewer is short.
 */
function WantRow({ row, count, side, picked, onPick, onRemove }: WantRowProps) {
  const owned = side?.owned ?? 0;
  const missing = side?.missing ?? 0;
  const short = Math.min(missing, count - picked.length);

  return (
    <RowFrame
      header={
        <>
          <RowLabel row={row} count={count} />
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs md:ml-auto",
              missing > 0
                ? "font-medium text-amber-700 dark:text-amber-400"
                : "text-teal-700 dark:text-teal-500",
            )}
          >
            {missing === 0 && <IconCircleCheck className="size-3.5" />}
            {row.want.kind === "exact"
              ? m.listing_detail_owned_exact({ count: formatCount(owned) })
              : m.listing_detail_owned_range({
                  count: owned,
                  formatted: formatCount(owned),
                })}
            {missing > 0 && ` · ${m.listing_detail_short({ count: missing })}`}
          </span>
        </>
      }
      footer={
        <span className="ml-auto tabular-nums">
          {m.listing_detail_picked({ picked: picked.length, count })}
        </span>
      }
    >
      {picked.map((pick) => {
        const shown = pickShown(pick);
        return (
          <li key={pick.tokenId} className={slotClass}>
            <OfferedTile
              shown={shown}
              refusal={undefined}
              onRemove={() => onRemove(pick)}
            />
            <OfferedCaption shown={shown} />
          </li>
        );
      })}
      {Array.from({ length: count - picked.length - short }, (_, slot) => (
        <li key={`open-${slot}`} className={slotClass}>
          <button
            type="button"
            onClick={onPick}
            className="flex aspect-photocard w-full flex-col items-center justify-center gap-1.5 rounded-photocard border border-dashed border-input p-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo"
          >
            <IconPlus className="size-4" />
            {m.listing_detail_slot_pick()}
          </button>
        </li>
      ))}
      {/* what the viewer doesn't own: the wanted objekt greyed out, or a blank card for a range */}
      {Array.from({ length: short }, (_, slot) => (
        <li key={`short-${slot}`} className={slotClass}>
          {row.want.kind === "exact" && row.want.collection !== null ? (
            <img
              src={getObjektFrontImageUrl(row.want.collection, "xs")}
              alt=""
              width={291}
              height={450}
              loading="lazy"
              decoding="async"
              className="aspect-photocard w-full rounded-photocard opacity-30 grayscale"
            />
          ) : (
            <div className="aspect-photocard rounded-photocard border border-dashed border-teal-500/40" />
          )}
        </li>
      ))}
    </RowFrame>
  );
}
