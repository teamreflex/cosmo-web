import { m } from "@/i18n/messages";
import { collectionListingsQuery } from "@/lib/queries/listings";
import { objektPriceHistoryQuery } from "@/lib/queries/objekt-queries";
import { listingStats } from "@/lib/universal/listings";
import type { updateObjektListEntrySchema } from "@/lib/universal/schema/objekt-list";
import { cn, formatPrice } from "@/lib/utils";
import { usePrefetchQuery, useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Skeleton } from "../ui/skeleton";

type Props = {
  slug: string;
  entryId: string;
  currency: string;
  rateToUsd: number;
  positionId: string;
  onViewListings?: () => void;
};

/**
 * Where the typed price sits among the collection's other asking prices, in
 * the list's currency, with quick fills from the market. It loads on its own
 * so the price input and save button never wait on it.
 */
export default function PriceCheck(props: Props) {
  // the floor note's history loads alongside the listings, not after them
  usePrefetchQuery(objektPriceHistoryQuery(props.slug, "30d"));

  return (
    <ErrorBoundary fallback={null}>
      <Suspense
        fallback={
          <>
            <Skeleton className="-mt-1.5 h-5 w-64 rounded-sm" />
            <Skeleton className="h-44 rounded-lg" />
          </>
        }
      >
        <PriceCheckContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function PriceCheckContent({
  slug,
  entryId,
  currency,
  rateToUsd,
  positionId,
  onViewListings,
}: Props) {
  const { data: listings } = useSuspenseQuery(collectionListingsQuery(slug));
  const { control, setValue } =
    useFormContext<z.infer<typeof updateObjektListEntrySchema>>();
  const price = useWatch({ control, name: "price" });
  const units = priceUnits(currency, rateToUsd);

  const others = listings.filter((listing) => listing.entryId !== entryId);
  const stats = listingStats(others);

  const footer = (
    <p className="text-xs text-muted-foreground">
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <FloorNote slug={slug} units={units} />
        </Suspense>
      </ErrorBoundary>
      {m.price_check_source()}
    </p>
  );

  if (stats === null) {
    return (
      <Panel heading={m.price_check_market()}>
        <p className="text-sm">{m.price_check_no_listings()}</p>
        {footer}
      </Panel>
    );
  }

  const prices = others.flatMap((listing) =>
    listing.priceUsd === null
      ? []
      : [{ id: listing.entryId, price: units.fromUsd(listing.priceUsd) }],
  );
  const floor = units.fromUsd(stats.floorUsd);
  const max = units.fromUsd(stats.maxUsd);
  const position = describePosition(
    pricePosition(
      price,
      prices.map((p) => p.price),
      floor,
    ),
    prices.length + 1,
    units.format(floor),
  );

  /**
   * The scale is fixed to the other prices so it doesn't shift while typing;
   * a typed price outside it pins to the nearest end.
   */
  const pad = Math.max((max - floor) / 4, floor * 0.4);
  const low = Math.max(0, units.round(floor - pad));
  const high = units.round(max + pad);
  const left = (value: number) =>
    `${((Math.min(high, Math.max(low, value)) - low) / (high - low)) * 100}%`;

  function fill(value: number) {
    setValue("price", value, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <>
      {position !== null && (
        <p
          id={positionId}
          className="-mt-1.5 flex h-5 items-baseline gap-2 text-sm"
        >
          <span
            className={cn(
              "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-xxs font-semibold tracking-[0.06em] whitespace-nowrap uppercase",
              position.tone,
            )}
          >
            {position.tag}
          </span>
          <span className="text-muted-foreground">{position.text}</span>
        </p>
      )}

      <Panel
        heading={`${m.price_check_market()} · ${m.price_check_other_listings({ count: prices.length })}`}
        action={
          onViewListings && (
            <button
              type="button"
              onClick={onViewListings}
              className="text-xxs text-cosmo-text hover:underline"
            >
              {m.price_check_see_listings()}
            </button>
          )
        }
      >
        <div
          role="img"
          aria-label={m.price_check_scale_label()}
          className="relative mb-1 h-10"
        >
          <span className="absolute inset-x-0 top-[19px] h-0.5 rounded-full bg-border" />
          {prices.map((p) => (
            <span
              key={p.id}
              className="absolute top-[13px] -ml-[7px] size-3.5 rounded-full border-2 border-popover bg-muted-foreground"
              style={{ left: left(p.price) }}
            />
          ))}
          {price !== null && price > 0 && (
            <span
              className="absolute top-2.5 -ml-2.5 size-5 rounded-full border-2 border-popover bg-cosmo transition-[left] duration-150"
              style={{ left: left(price) }}
            />
          )}
          <span className="absolute -bottom-1 left-0 font-mono text-xxs text-muted-foreground">
            {units.format(low)}
          </span>
          <span className="absolute right-0 -bottom-1 font-mono text-xxs text-muted-foreground">
            {units.format(high)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <QuickFill
            label={m.price_check_undercut()}
            value={units.below(floor)}
            format={units.format}
            onFill={fill}
          />
          <QuickFill
            label={m.price_check_match_floor()}
            value={floor}
            format={units.format}
            onFill={fill}
          />
          <QuickFill
            label={m.listings_stat_median()}
            value={units.fromUsd(stats.medianUsd)}
            format={units.format}
            onFill={fill}
          />
        </div>

        {footer}
      </Panel>
    </>
  );
}

type PanelProps = {
  heading: string;
  action?: ReactNode;
  children: ReactNode;
};

function Panel({ heading, action, children }: PanelProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xxs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {heading}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

type QuickFillProps = {
  label: string;
  value: number | null;
  format: (value: number) => string;
  onFill: (value: number) => void;
};

function QuickFill({ label, value, format, onFill }: QuickFillProps) {
  return (
    <button
      type="button"
      disabled={value === null}
      onClick={() => value !== null && onFill(value)}
      className="flex min-w-0 flex-col items-start gap-1.5 rounded-md border border-border px-2 py-2 text-left transition-colors hover:border-cosmo/80 hover:bg-cosmo/10 disabled:pointer-events-none disabled:opacity-50 sm:px-2.5"
    >
      <span className="max-w-full truncate text-xxs leading-none font-medium tracking-[0.04em] text-muted-foreground uppercase sm:tracking-[0.12em]">
        {label}
      </span>
      <span className="max-w-full truncate font-mono text-sm leading-none font-bold tabular-nums">
        {value === null ? "—" : format(value)}
      </span>
    </button>
  );
}

type Units = ReturnType<typeof priceUnits>;

/**
 * The 30-day-old floor snapshot, hidden when the collection has no history
 * older than today.
 */
function FloorNote({ slug, units }: { slug: string; units: Units }) {
  const [now] = useState(() => Date.now());
  const { data: first } = useSuspenseQuery({
    ...objektPriceHistoryQuery(slug, "30d"),
    select: (history) => history.points[0] ?? null,
  });
  if (first === null) return null;

  const days = Math.floor(
    (now - Date.parse(`${first.date}T00:00:00Z`)) / 86_400_000,
  );
  if (days < 1) return null;

  return (
    <>
      {m.price_check_floor_ago({
        count: days,
        price: units.format(units.fromUsd(first.floorUsd)),
      })}{" "}
    </>
  );
}

/**
 * Rounding and stepping for prices in the list's currency. Other listings are
 * converted through USD and rounded to the currency's minor unit, so "Match
 * floor" reads back as tied. The undercut step is about one US cent rounded
 * down to a power of ten, but never finer than the minor unit: 0.01 for USD
 * or NZD, 1 for JPY, 10 for KRW.
 */
function priceUnits(currency: string, rateToUsd: number) {
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  const scale = 10 ** (digits ?? 2);
  const step = Math.max(
    1 / scale,
    10 ** Math.floor(Math.log10(0.01 / rateToUsd)),
  );
  const round = (value: number) => Math.round(value * scale) / scale;

  return {
    round,
    fromUsd: (usd: number) => round(usd / rateToUsd),
    format: (value: number) => formatPrice(value, currency),
    /**
     * The highest step multiple under `value`, or null when that isn't a
     * valid (positive) price. The epsilon keeps float noise such as
     * 2.5 / 0.01 = 250.00000000000003 from skipping a step.
     */
    below: (value: number) => {
      const under = round((Math.ceil(value / step - 1e-9) - 1) * step);
      return under > 0 ? under : null;
    },
  };
}

type Position =
  | { kind: "unpriced" }
  | { kind: "floor" }
  | { kind: "tied" }
  | { kind: "ranked"; rank: number; highest: boolean };

/**
 * Rank of `price` among the other prices, or null while the input holds
 * something that isn't a valid price.
 */
function pricePosition(
  price: number | null,
  others: number[],
  floor: number,
): Position | null {
  if (price === null) return { kind: "unpriced" };
  if (Number.isNaN(price) || price <= 0) return null;
  if (price < floor) return { kind: "floor" };
  if (price === floor) return { kind: "tied" };

  const below = others.filter((other) => other < price).length;
  return { kind: "ranked", rank: below + 1, highest: below === others.length };
}

function describePosition(
  position: Position | null,
  total: number,
  floor: string,
) {
  switch (position?.kind) {
    case undefined:
      return null;
    case "unpriced":
      return {
        tag: m.price_check_tag_unpriced(),
        text: m.price_check_unpriced(),
        tone: "bg-muted text-muted-foreground",
      };
    case "floor":
      return {
        tag: m.listings_stat_floor(),
        text: m.price_check_floor({ total }),
        tone: "bg-emerald-300 text-black",
      };
    case "tied":
      return {
        tag: m.price_check_tag_tied(),
        text: m.price_check_tied(),
        tone: "bg-cosmo/18 text-cosmo-text",
      };
    case "ranked":
      return {
        tag: m.price_check_tag_rank({ rank: position.rank, total }),
        text: position.highest
          ? m.price_check_highest()
          : m.price_check_cheaper({ price: floor }),
        tone: "bg-muted text-muted-foreground",
      };
  }
}
