import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useMarketQuery } from "@/hooks/use-market";
import { m } from "@/i18n/messages";
import {
  type FloorBounds,
  inFloorBounds,
  toFloorBounds,
} from "@/lib/universal/market";
import { cn } from "@/lib/utils";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import FilterChip from "../collection/filter-chip";

const route = getRouteApi("/market");

const BUCKETS = 24;

/**
 * Quick range breakpoints in USD, rounded to tidy amounts in the viewer's
 * currency so they read naturally in any currency.
 */
const QUICK_BREAKPOINTS_USD = [1, 5, 15];

type Price = number | null;

/**
 * Filters the market by collection floor, entered in the viewer's currency.
 */
export default function MarketPriceFilter() {
  const min = route.useSearch({ select: (search) => search.price_min ?? null });
  const max = route.useSearch({ select: (search) => search.price_max ?? null });
  const { currency } = useDisplayCurrency();

  return (
    <FilterChip
      label={m.filter_price()}
      valueLabel={
        rangeLabel(min, max, currencyFormat(currency)) ?? m.filter_value_any()
      }
      active={min !== null || max !== null}
      width={300}
    >
      {({ close }) => (
        <Suspense fallback={<Skeleton className="m-3.5 h-64" />}>
          <PricePanel min={min} max={max} close={close} />
        </Suspense>
      )}
    </FilterChip>
  );
}

type PricePanelProps = {
  min: Price;
  max: Price;
  close: () => void;
};

function PricePanel({ min, max, close }: PricePanelProps) {
  const navigate = route.useNavigate();
  const display = useDisplayCurrency();
  const { data: floors } = useSuspenseInfiniteQuery({
    ...useMarketQuery(),
    select: (data) => data.pages[0]?.floors ?? [],
  });
  const [draftMin, setDraftMin] = useState(min);
  const [draftMax, setDraftMax] = useState(max);

  const [low, high] =
    draftMin !== null && draftMax !== null && draftMin > draftMax
      ? [draftMax, draftMin]
      : [draftMin, draftMax];
  const bounds = toFloorBounds(low, high, display);
  const count = floors.filter((floor) => inFloorBounds(floor, bounds)).length;
  const plain = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

  function apply() {
    void navigate({
      search: (prev) => ({
        ...prev,
        price_min: low ?? undefined,
        price_max: high ?? undefined,
      }),
      replace: true,
    });
    close();
  }

  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xxs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {m.filter_price_heading({ currency: display.currency })}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {m.filter_price_matching({
              count: count.toLocaleString("en"),
              total: floors.length.toLocaleString("en"),
            })}
          </span>
        </div>

        <Histogram floors={floors} bounds={bounds} />

        <div className="grid grid-cols-2 gap-2">
          <PriceInput
            label={m.filter_price_min()}
            ariaLabel={m.filter_price_min_aria()}
            value={draftMin}
            onChange={setDraftMin}
          />
          <PriceInput
            label={m.filter_price_max()}
            ariaLabel={m.filter_price_max_aria()}
            value={draftMax}
            onChange={setDraftMax}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickRanges(display.rateToUsd).map(([rangeMin, rangeMax]) => (
            <Button
              key={`${rangeMin}-${rangeMax}`}
              type="button"
              variant="outline"
              size="xs"
              aria-pressed={rangeMin === low && rangeMax === high}
              className="aria-pressed:border-cosmo/80 aria-pressed:bg-cosmo/10"
              onClick={() => {
                setDraftMin(rangeMin);
                setDraftMax(rangeMax);
              }}
            >
              {rangeLabel(rangeMin, rangeMax, plain)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            setDraftMin(null);
            setDraftMax(null);
          }}
        >
          {m.filter_price_clear()}
        </Button>
        <Button type="submit" size="sm">
          {m.filter_price_show({ count: count.toLocaleString("en") })}
        </Button>
      </div>
    </form>
  );
}

type PriceInputProps = {
  label: string;
  ariaLabel: string;
  value: Price;
  onChange: (value: Price) => void;
};

function PriceInput({ label, ariaLabel, value, onChange }: PriceInputProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={ariaLabel}
        className="font-mono"
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : event.target.valueAsNumber,
          )
        }
      />
    </label>
  );
}

type HistogramProps = {
  floors: number[];
  bounds: FloorBounds;
};

/**
 * Floor distribution on a log scale, since floors span a few orders of
 * magnitude. Bars holding a floor inside the draft range are highlighted.
 */
function Histogram({ floors, bounds }: HistogramProps) {
  const low = Math.log(Math.min(...floors));
  const span = Math.log(Math.max(...floors)) - low;
  const buckets = Array.from({ length: BUCKETS }, () => ({
    count: 0,
    inRange: false,
  }));
  for (const floor of floors) {
    const bucket =
      buckets[
        span === 0
          ? 0
          : Math.min(
              BUCKETS - 1,
              Math.floor(((Math.log(floor) - low) / span) * BUCKETS),
            )
      ];
    if (bucket) {
      bucket.count++;
      bucket.inRange ||= inFloorBounds(floor, bounds);
    }
  }
  const tallest = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <div aria-hidden className="flex h-14 items-end gap-[3px]">
      {buckets.map((bucket, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-t-[2px]",
            bucket.inRange ? "bg-cosmo" : "bg-foreground/15",
          )}
          style={{
            height:
              bucket.count === 0
                ? 0
                : `${Math.max(4, (bucket.count / tallest) * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}

function currencyFormat(currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  });
}

function rangeLabel(min: Price, max: Price, format: Intl.NumberFormat) {
  if (min !== null && max !== null) {
    return m.filter_price_range({
      min: format.format(min),
      max: format.format(max),
    });
  }
  if (min !== null) return m.filter_price_from({ price: format.format(min) });
  if (max !== null) return m.filter_price_up_to({ price: format.format(max) });
  return undefined;
}

/**
 * Up to the first breakpoint, between each pair, then above the last.
 */
function quickRanges(rateToUsd: number): [Price, Price][] {
  const points = QUICK_BREAKPOINTS_USD.map((usd) => tidy(usd / rateToUsd));
  return [null, ...points].map((point, i) => [point, points[i] ?? null]);
}

/**
 * Rounds to the nearest 1, 2, 2.5 or 5 times a power of ten.
 */
function tidy(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return (
    magnitude *
    [1, 2, 2.5, 5, 10].reduce((best, step) =>
      Math.abs(step * magnitude - value) < Math.abs(best * magnitude - value)
        ? step
        : best,
    )
  );
}
