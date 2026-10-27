import type { Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import type { TradeRatio } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import ComposerStepper from "./composer-stepper";

type Props = {
  ratio: TradeRatio;
  picks: Picks;
};

/**
 * How many times over the viewer takes the listing's ratio, "1 for 1, up
 * to 5 times", stepped between one and the most they can take, with what
 * each side then counts. Phones leave the counts to the bottom bar.
 */
export default function ListingUnits({ ratio, picks }: Props) {
  const ratioText = m.market_listings_ratio(ratio);
  const caption =
    picks.short > 0
      ? ratioText
      : m.listing_detail_units_caption({
          ratio: ratioText,
          count: picks.maxUnits,
        });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-card px-4 py-3 md:py-3.5 lg:col-span-full">
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5 text-sm">
        {/* the stepper's group label reads it out */}
        <span aria-hidden className="font-semibold">
          {m.listing_detail_units_title()}
        </span>
        <span className="text-muted-foreground">
          {`${caption} · ${m.market_listings_available({ count: picks.freeCount })}`}
        </span>
      </div>
      <ComposerStepper
        size="lg"
        value={picks.units}
        canDecrement={picks.units > 1}
        canIncrement={picks.units < picks.maxUnits}
        labels={{
          group: m.listing_detail_units_title(),
          fewer: m.listing_detail_units_fewer(),
          more: m.listing_detail_units_more(),
        }}
        className="bg-transparent"
        valueClassName="min-w-10 text-lg font-normal"
        onStep={(delta) => picks.setUnits(picks.units + delta)}
      />
      <UnitCounts picks={picks} className="max-md:hidden" />
    </div>
  );
}

/**
 * What each side of the claim counts at this many units: "you get 3 · you
 * give 3".
 */
export function UnitCounts({
  picks,
  className,
}: {
  picks: Picks;
  className?: string;
}) {
  return (
    <span
      className={cn("flex gap-4 font-mono text-xs tabular-nums", className)}
    >
      <span className="text-amber-700 dark:text-amber-500">
        {m.listing_detail_units_get({ count: picks.offeredCount })}
      </span>
      <span className="text-teal-700 dark:text-teal-500">
        {m.listing_detail_units_give({ count: picks.giveTotal })}
      </span>
    </span>
  );
}
