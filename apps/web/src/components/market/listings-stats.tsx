import PriceDelta from "@/components/objekt/price-delta";
import PriceSparkline from "@/components/objekt/price-sparkline";
import { StatCell } from "@/components/ui/stat-cell";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import {
  objektPriceHistoryQuery,
  objektQuery,
} from "@/lib/queries/objekt-queries";
import type { ListingStats } from "@/lib/universal/listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type StripProps = {
  collection: Objekt.Collection;
  stats: ListingStats;
};

/**
 * Desktop strip under the listings header: floor with its 30-day change,
 * median, range, and the 30-day floor sparkline.
 */
export function ListingsStatsStrip({ collection, stats }: StripProps) {
  const display = useDisplayCurrency();

  return (
    <div className="flex shrink-0 items-stretch border-b border-border">
      <StatCell
        label={m.listings_stat_floor()}
        value={
          <span className="flex items-center gap-2">
            {display.formatUsd(stats.floorUsd)}
            <FloorChange slug={collection.slug} />
          </span>
        }
        mono
      />
      <StatCell
        label={m.listings_stat_median()}
        value={display.formatUsd(stats.medianUsd)}
        mono
      />
      <StatCell
        label={m.listings_stat_range()}
        value={
          stats.floorUsd === stats.maxUsd
            ? formatAmount(stats.floorUsd, display)
            : `${formatAmount(stats.floorUsd, display)} – ${formatAmount(stats.maxUsd, display)}`
        }
        mono
      />
      <FloorTrend
        collection={collection}
        className="h-14 w-60 shrink-0 justify-center px-4"
        chartClassName="h-7"
      />
    </div>
  );
}

/**
 * Change in the daily floor snapshot over the last 30 days. Renders nothing
 * until there are two snapshots to compare, or if the history fails to load.
 */
export function FloorChange({ slug }: { slug: string }) {
  return (
    <HistoryBoundary>
      <FloorChangePill slug={slug} />
    </HistoryBoundary>
  );
}

/**
 * The 30-day floor sparkline under its label and a link to the full history
 * on the pricing tab, with the same fallbacks as `FloorChange`.
 */
export function FloorTrend(props: TrendProps) {
  return (
    <HistoryBoundary>
      <FloorTrendChart {...props} />
    </HistoryBoundary>
  );
}

function FloorChangePill({ slug }: { slug: string }) {
  const floors = useFloorHistory(slug);
  const first = floors[0];
  const last = floors[floors.length - 1];
  if (floors.length < 2 || first === undefined || last === undefined) {
    return null;
  }

  return <PriceDelta from={first} to={last} />;
}

type TrendProps = {
  collection: Objekt.Collection;
  className?: string;
  chartClassName?: string;
};

function FloorTrendChart({
  collection,
  className,
  chartClassName,
}: TrendProps) {
  const queryClient = useQueryClient();
  const { open } = useMetadataDialog();
  const floors = useFloorHistory(collection.slug);
  if (floors.length < 2) return null;

  function openHistory() {
    queryClient.setQueryData(objektQuery(collection.slug).queryKey, collection);
    open(collection.slug, { type: "tab", tab: "pricing" });
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
          {m.listings_floor_30d()}
        </span>
        <button
          type="button"
          onClick={openHistory}
          className="text-xxs text-cosmo-text hover:underline"
        >
          {m.listings_history()}
        </button>
      </div>
      <PriceSparkline
        values={floors}
        label={m.listings_floor_trend()}
        className={chartClassName}
      />
    </div>
  );
}

/**
 * Daily floor snapshots (USD) over the last 30 days, shared with the pricing
 * tab's default range so either one fills the cache for the other.
 */
function useFloorHistory(slug: string) {
  const { data } = useSuspenseQuery({
    ...objektPriceHistoryQuery(slug, "30d"),
    select: (history) => history.points.map((p) => p.floorUsd),
  });
  return data;
}

function HistoryBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/**
 * A price in the viewer's currency without its symbol, for a compact range.
 */
function formatAmount(
  usd: number,
  display: { currency: string; rateToUsd: number },
) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: display.currency,
  })
    .formatToParts(usd / display.rateToUsd)
    .filter((part) => part.type !== "currency")
    .map((part) => part.value)
    .join("")
    .trim();
}
