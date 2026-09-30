import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import { m } from "@/i18n/messages";
import { formatDay } from "@/lib/client/time";
import {
  type PriceHistory as PriceHistoryData,
  type PriceHistoryRange,
  type PriceStats,
  priceHistoryRangeDays,
  priceHistoryRanges,
} from "@/lib/universal/objekts";
import type { ReactNode } from "react";
import PriceDelta from "../price-delta";
import PriceDisplay from "../price-display";
import PriceHistoryChart from "./price-history-chart";

type Props = {
  history: PriceHistoryData;
  stats: PriceStats | null;
  range: PriceHistoryRange;
  onRangeChange: (range: PriceHistoryRange) => void;
  /**
   * Too few snapshots to split into ranges, so the toggle stays on all.
   */
  locked: boolean;
};

const RANGE_LABELS = {
  "7d": m.objekt_metadata_history_range_7d,
  "30d": m.objekt_metadata_history_range_30d,
  "90d": m.objekt_metadata_history_range_90d,
  all: m.objekt_metadata_history_range_all,
} satisfies Record<PriceHistoryRange, () => string>;

/**
 * Floor price history block on the pricing tab: the latest floor with its
 * change over the selected range, a range toggle, the current listing stats,
 * and the daily snapshot chart.
 */
export default function PriceHistory({
  history,
  stats,
  range,
  onRangeChange,
  locked,
}: Props) {
  // Intl date output can differ between the server runtime and the browser
  const hydrated = useHydrated();
  const { points } = history;
  const first = points[0];
  const last = points[points.length - 1];
  const floor = last?.floorUsd ?? stats?.minPriceUsd;

  return (
    <div className="@container flex flex-col gap-2.5 border-b border-border px-4 py-3">
      {/* the toggle drops below the floor in a narrow sheet */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
            {range === "all"
              ? m.objekt_metadata_history_floor_all()
              : m.objekt_metadata_history_floor_days({
                  days: priceHistoryRangeDays[range].toString(),
                })}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold tabular-nums">
              {floor === undefined ? "—" : <PriceDisplay usd={floor} />}
            </span>
            {first !== undefined && last !== undefined && points.length > 1 && (
              <>
                <PriceDelta from={first.floorUsd} to={last.floorUsd} />
                {hydrated ? (
                  <span className="text-xxs whitespace-nowrap text-muted-foreground">
                    {m.objekt_metadata_history_vs({
                      date: formatDay(first.date),
                    })}
                  </span>
                ) : (
                  <Skeleton className="h-3 w-16 rounded-full" />
                )}
              </>
            )}
          </div>
        </div>

        {history.tracking !== null && (
          <Tabs
            value={range}
            // SAFETY: tab values are the PriceHistoryRange variants
            onValueChange={(value) => onRangeChange(value as PriceHistoryRange)}
          >
            <TabsList className="h-7">
              {priceHistoryRanges.map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  disabled={locked && value !== "all"}
                  className="px-2 font-mono text-xxs"
                >
                  {RANGE_LABELS[value]()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {stats !== null && (
        <div className="grid grid-cols-3 gap-2">
          <StatBox
            label={m.objekt_metadata_market_price()}
            value={<PriceDisplay usd={stats.medianPriceUsd} />}
          />
          <StatBox
            label={m.objekt_metadata_max_price()}
            value={<PriceDisplay usd={stats.maxPriceUsd} />}
          />
          <StatBox
            label={m.objekt_metadata_listing_count()}
            value={stats.listingCount.toString()}
          />
        </div>
      )}

      {points.length > 0 ? (
        <PriceHistoryChart points={points} />
      ) : (
        <p className="flex h-40 items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
          {history.tracking === null
            ? m.objekt_metadata_history_empty()
            : m.objekt_metadata_history_range_empty()}
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-border px-2 py-2 @sm:px-2.5">
      <span className="truncate text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className="truncate font-mono text-xs font-bold tabular-nums @sm:text-sm">
        {value}
      </span>
    </div>
  );
}
