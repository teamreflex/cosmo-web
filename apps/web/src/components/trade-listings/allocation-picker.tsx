import type { PickerRow, Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { formatCount, pickShown, wantScope } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  Candidate,
  CandidateRow,
  ListingPick,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { IconCircleCheck, IconPlus, IconX } from "@tabler/icons-react";
import { Fragment, type ReactNode, useState } from "react";
import { ObjektCardFace } from "../objekt/common";
import { RemovableTile, TileCaption } from "./composer-offered";
import { RangeBadges } from "./range-want";
import RowPicker from "./row-picker";
import SideHeading from "./side-heading";
import WantLabel from "./want-label";

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
 * claim's size, which the viewer fills from their own collection. Removing a
 * pick empties its slot, and an empty slot opens the viewer's collection
 * held to that row. Accept, or Send offer, lives in the page header, which
 * says whether the picks fit.
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
        summary={m.listing_detail_you_give_summary()}
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
            {address !== undefined && (
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
    <WantLabel want={{ ...row.want, count }} />
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
            <RemovableTile
              shown={shown}
              refusal={undefined}
              onRemove={() => onRemove(pick)}
            />
            <TileCaption shown={shown} />
          </li>
        );
      })}
      {Array.from({ length: count - picked.length - short }, (_, slot) => (
        <li key={`open-${slot}`} className={slotClass}>
          <PickSlot
            collection={row.want.kind === "exact" ? row.want.collection : null}
            onPick={onPick}
          />
        </li>
      ))}
      {/* what the viewer doesn't own: the wanted objekt, or every collection an "any of" row takes */}
      {short > 0 && row.want.kind === "choice"
        ? row.want.options.map((option) => (
            <li key={`short-${option.slug}`} className={slotClass}>
              <MissingCard collection={option.collection} />
            </li>
          ))
        : Array.from({ length: short }, (_, slot) => (
            <li key={`short-${slot}`} className={slotClass}>
              <MissingCard
                collection={
                  row.want.kind === "exact" ? row.want.collection : null
                }
              />
            </li>
          ))}
    </RowFrame>
  );
}

// a slot that opens the picker, dimming the wanted objekt when the row names one
function PickSlot({
  collection,
  onPick,
}: {
  collection: Objekt.Collection | null;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group relative flex aspect-photocard w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-photocard border border-dashed border-input p-2 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cosmo",
        collection === null
          ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          : "text-white",
      )}
    >
      {collection !== null && (
        <>
          <ObjektCardFace
            collection={collection}
            className="absolute inset-0"
          />
          <span className="absolute inset-0 bg-black/55 transition-colors group-hover:bg-black/35" />
        </>
      )}
      <IconPlus className="relative size-4" />
      <span className="relative">{m.listing_detail_slot_pick()}</span>
    </button>
  );
}

// a wanted collection greyed out, or a crossed-out slot for a range
function MissingCard({ collection }: { collection: Objekt.Collection | null }) {
  return collection === null ? (
    <div className="flex aspect-photocard w-full flex-col items-center justify-center gap-1.5 rounded-photocard border border-dashed border-input p-2 text-center text-xs font-medium text-muted-foreground">
      <IconX className="size-4" />
      {m.listing_detail_slot_short()}
    </div>
  ) : (
    <span className="block aspect-photocard w-full overflow-hidden rounded-photocard opacity-30 grayscale">
      <ObjektCardFace collection={collection} />
    </span>
  );
}
