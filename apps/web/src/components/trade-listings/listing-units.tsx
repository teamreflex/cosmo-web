import type { Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { listingRatio } from "@/lib/client/trade-listings";
import type { TradeListing } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useId } from "react";
import { Button } from "../ui/button";

type Props = {
  listing: TradeListing;
  picks: Picks;
};

/**
 * How many times over the viewer takes the listing's ratio, "1 for 1, up
 * to 5 times", stepped between one and the most they can take, with what
 * each side then counts. Phones leave the counts to the bottom bar.
 */
export default function ListingUnits({ listing, picks }: Props) {
  const labelId = useId();
  const ratio = m.market_listings_ratio(listingRatio(listing));
  const available = m.market_listings_available({ count: picks.freeCount });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-card px-4 py-3 md:py-3.5 lg:col-span-full">
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5 text-sm">
        <span id={labelId} className="font-semibold">
          {m.listing_detail_units_title()}
        </span>
        <span className="text-muted-foreground">
          {picks.short > 0
            ? `${ratio} · ${available}`
            : `${m.listing_detail_units_caption({ ratio, count: picks.maxUnits })} · ${available}`}
        </span>
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex items-center gap-1 rounded-md border border-border p-0.5"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={m.listing_detail_units_fewer()}
          disabled={picks.units <= 1}
          onClick={() => picks.setUnits(picks.units - 1)}
          className="touch-manipulation max-md:size-11"
        >
          <IconMinus />
        </Button>
        <output
          aria-live="polite"
          className="min-w-10 text-center font-mono text-lg tabular-nums"
        >
          {picks.units}
        </output>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={m.listing_detail_units_more()}
          disabled={picks.units >= picks.maxUnits}
          onClick={() => picks.setUnits(picks.units + 1)}
          className="touch-manipulation max-md:size-11"
        >
          <IconPlus />
        </Button>
      </div>
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
