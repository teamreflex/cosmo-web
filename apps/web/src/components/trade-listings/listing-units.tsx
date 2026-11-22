import type { Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import {
  buyingText,
  formatAmount,
  ratioText,
} from "@/lib/client/trade-listings";
import type { TradeRatio } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import ComposerStepper from "./composer-stepper";

type Props = {
  ratio: TradeRatio;
  picks: Picks;
};

/**
 * How many times over the viewer takes the listing's ratio, "1 for 1, up
 * to 5 times", stepped between one and the most they can take, beside how
 * many the pool has free or a buy listing has left, with what each side
 * then counts. Phones leave the counts to the bottom bar.
 */
export default function ListingUnits({ ratio, picks }: Props) {
  // with no asking price on the claimer's payment, the units are the objekts alone; a buy listing's reads "an offer for 1"
  const text =
    ratio.payment?.amount === null && ratio.payment.sender === "to"
      ? ratio.get === 0
        ? m.market_listings_objekts({ count: ratio.give })
        : ratioText({ ...ratio, payment: null })
      : ratioText(ratio);
  const caption =
    picks.short > 0
      ? text
      : m.listing_detail_units_caption({
          ratio: text,
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
          {picks.buying === null
            ? `${caption} · ${m.market_listings_available({ count: picks.freeCount })}`
            : // the caption's "up to" already says it until trades hold some
              picks.buying.taken === 0
              ? caption
              : [caption, buyingText(picks.buying)]
                  .filter((part) => part !== undefined)
                  .join(" · ")}
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
 * What each side of the claim counts at this many units, its payment
 * included: "you get 3 · you give 3", "you get 1 · you pay $3.00", "you
 * get $6.00 · you give 2".
 */
export function UnitCounts({
  picks,
  className,
}: {
  picks: Picks;
  className?: string;
}) {
  const { payment } = picks;
  // with no asking price, the payment is named in the offer, not here
  const priced =
    payment === null || payment.amount === null
      ? null
      : {
          side: payment.side,
          amount: formatAmount(payment.amount * picks.units, payment.currency),
        };
  return (
    <span
      className={cn("flex gap-4 font-mono text-xs tabular-nums", className)}
    >
      {(picks.offeredCount > 0 || priced?.side === "from") && (
        <span className="text-amber-700 dark:text-amber-500">
          {sideText(
            picks.offeredCount,
            priced?.side === "from" ? priced.amount : null,
            {
              count: m.listing_detail_units_get,
              amount: m.listing_detail_units_get_amount,
              both: m.listing_detail_units_get_pay,
            },
          )}
        </span>
      )}
      {(picks.giveTotal > 0 || priced?.side === "to") && (
        <span className="text-teal-700 dark:text-teal-500">
          {sideText(
            picks.giveTotal,
            priced?.side === "to" ? priced.amount : null,
            {
              count: m.listing_detail_units_give,
              amount: m.listing_detail_units_pay,
              both: m.listing_detail_units_give_pay,
            },
          )}
        </span>
      )}
    </span>
  );
}

/**
 * One side's count in the side's own words: its objekts, its payment alone (`amount`, null when the side sends none), or both.
 */
function sideText(
  count: number,
  amount: string | null,
  text: {
    count: (inputs: { count: number }) => string;
    amount: (inputs: { amount: string }) => string;
    both: (inputs: { count: number; amount: string }) => string;
  },
) {
  if (amount === null) return text.count({ count });
  return count === 0 ? text.amount({ amount }) : text.both({ count, amount });
}
