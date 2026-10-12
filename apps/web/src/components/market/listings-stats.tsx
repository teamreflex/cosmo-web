import PriceDelta from "@/components/objekt/price-delta";
import PriceDisplay from "@/components/objekt/price-display";
import PriceSparkline from "@/components/objekt/price-sparkline";
import { StatCell } from "@/components/ui/stat-cell";
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
 * median, highest, and the 30-day floor sparkline.
 */
export function ListingsStatsStrip({ collection, stats }: StripProps) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-border">
      <StatCell
        label={m.market_floor()}
        value={
          <span className="flex items-center gap-2">
            <PriceDisplay usd={stats.floorUsd} />
            <FloorChange slug={collection.slug} floorUsd={stats.floorUsd} />
          </span>
        }
        mono
      />
      <StatCell
        label={m.objekt_metadata_market_price()}
        value={<PriceDisplay usd={stats.medianUsd} />}
        mono
      />
      <StatCell
        label={m.objekt_metadata_max_price()}
        value={<PriceDisplay usd={stats.maxUsd} />}
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

type ChangeProps = {
  slug: string;
  floorUsd: number;
};

/**
 * Change from the oldest daily floor snapshot of the last 30 days to the
 * current floor. Renders nothing until there are two snapshots, or if the
 * history fails to load.
 */
export function FloorChange(props: ChangeProps) {
  return (
    <HistoryBoundary>
      <FloorChangePill {...props} />
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

function FloorChangePill({ slug, floorUsd }: ChangeProps) {
  const floors = useFloorHistory(slug);
  const [first] = floors;
  if (floors.length < 2 || first === undefined) return null;

  return <PriceDelta from={first} to={floorUsd} />;
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
