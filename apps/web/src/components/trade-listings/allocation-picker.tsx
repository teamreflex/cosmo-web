import type { PickerRow, Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { formatCount, objektName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingCandidate,
  ListingViewer,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { offersSwap, swapTarget } from "@apollo/trades/picker";
import { IconCircleCheck } from "@tabler/icons-react";
import PickerCard from "./picker-card";
import { RangeBadges } from "./range-want";
import SideHeading from "./side-heading";
import WantLabel from "./want-label";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

type Props = {
  viewer: Candidate;
  rows: PickerRow[];
  picks: Picks;
};

/**
 * What the viewer would give, one panel per want row. Tapping a copy picks
 * it or drops it; tapping one in a full row swaps it for the row's last
 * pick. Accept lives in the page header, which says whether the picks fit.
 */
export default function AllocationPicker({ viewer, rows, picks }: Props) {
  const { candidates, picked, total } = picks;
  const collections = new Map(
    viewer.collections.map((collection) => [collection.slug, collection]),
  );
  const pickedRow = new Map(
    picked.flatMap((tokenIds, row) =>
      tokenIds.map((tokenId) => [tokenId, row] as const),
    ),
  );

  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      <SideHeading
        tone="have"
        title={m.listing_detail_you_give_total({ count: total })}
        summary={m.listing_detail_you_give_summary()}
      />

      {rows.map((row, index) => (
        <WantRow
          key={index}
          row={row}
          owned={viewer.rowOwned[index] ?? 0}
          missing={viewer.allocation[index]?.missing ?? 0}
          candidates={candidates[index] ?? []}
          picked={picked[index] ?? []}
          pickedRow={pickedRow}
          index={index}
          collections={collections}
          onToggle={(tokenId) => picks.toggle(index, tokenId, row.trade.count)}
        />
      ))}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {m.listing_detail_accept_footer({ appName: env.VITE_APP_NAME })}
      </p>
    </section>
  );
}

type WantRowProps = {
  row: PickerRow;
  owned: number;
  missing: number;
  candidates: ListingCandidate[];
  picked: number[];
  pickedRow: Map<number, number>;
  index: number;
  collections: Map<string, Objekt.Collection>;
  onToggle: (tokenId: number) => void;
};

function WantRow({
  row,
  owned,
  missing,
  candidates,
  picked,
  pickedRow,
  index,
  collections,
  onToggle,
}: WantRowProps) {
  // what tapping an unpicked copy of a full row would swap out
  const swapped = candidates.find(
    (candidate) => candidate.tokenId === swapTarget(picked, row.trade.count),
  );
  const swapping =
    swapped &&
    `${objektName(collections.get(swapped.attributes.slug) ?? null, swapped.attributes)} ${formatSerial(swapped.serial)}`;

  return (
    <div
      className={cn(
        "flex flex-col overflow-clip rounded-lg border",
        missing > 0
          ? "border-amber-500/50 bg-amber-500/5"
          : "border-teal-500/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-border/60 px-4 py-3 text-sm">
        {row.want.kind === "range" ? (
          <RangeBadges
            count={row.want.count}
            filter={row.want.filter}
            matches={false}
          />
        ) : (
          <WantLabel want={row.want} />
        )}
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
      </div>

      {/* one scrolling strip at every width, however many copies match */}
      <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain px-4 py-3.5">
        {candidates.map((candidate) => {
          const owner = pickedRow.get(candidate.tokenId);
          return (
            <PickerCard
              key={candidate.tokenId}
              candidate={candidate}
              collection={collections.get(candidate.attributes.slug)}
              picked={owner === index}
              disabledReason={
                owner !== undefined && owner !== index
                  ? m.listing_detail_card_other_row()
                  : null
              }
              swapsOut={
                owner === undefined && swapping !== undefined
                  ? m.listing_detail_card_swap({ objekt: swapping })
                  : null
              }
              onToggle={() => onToggle(candidate.tokenId)}
            />
          );
        })}
        {Array.from({ length: missing }, (_, slot) => (
          <div
            key={`missing-${slot}`}
            className="@container w-11 shrink-0 md:w-21"
          >
            <div className="aspect-photocard rounded-photocard border border-dashed border-amber-500/60" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        {offersSwap(candidates, row.trade.count) && (
          <span>{m.listing_detail_duplicates_hint()}</span>
        )}
        <span className="ml-auto tabular-nums">
          {m.listing_detail_picked({
            picked: picked.length,
            count: row.trade.count,
          })}
        </span>
      </div>
    </div>
  );
}
