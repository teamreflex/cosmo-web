import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import { formatDay } from "@/lib/client/time";
import { objektPriceHistoryQuery } from "@/lib/queries/objekt-queries";
import {
  type PriceHistoryRange,
  priceHistoryRanges,
} from "@/lib/universal/objekts";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import PriceDisplay from "../price-display";
import PriceHistoryChart from "./price-history-chart";

type Props = {
  slug: string;
};

const RANGE_LABELS = {
  "7d": m.objekt_metadata_history_range_7d,
  "30d": m.objekt_metadata_history_range_30d,
  "90d": m.objekt_metadata_history_range_90d,
  all: m.objekt_metadata_history_range_all,
} satisfies Record<PriceHistoryRange, () => string>;

/**
 * Floor price history block on the pricing tab: current floor with its change
 * over the selected range, a range toggle, and the daily snapshot chart.
 */
export default function PriceHistory({ slug }: Props) {
  const [range, setRange] = useState<PriceHistoryRange>("30d");

  return (
    <ErrorBoundary fallback={null}>
      <Suspense
        fallback={
          <div className="flex h-56 items-center justify-center border-b border-border">
            <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <History slug={slug} range={range} setRange={setRange} />
      </Suspense>
    </ErrorBoundary>
  );
}

function History({
  slug,
  range,
  setRange,
}: Props & {
  range: PriceHistoryRange;
  setRange: (range: PriceHistoryRange) => void;
}) {
  const { data: points } = useSuspenseQuery(
    objektPriceHistoryQuery(slug, range),
  );
  const first = points[0];
  const last = points[points.length - 1];

  // nothing has ever been recorded: the stat cells above already say so
  if (first === undefined || last === undefined) return null;

  return (
    <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xxs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {m.objekt_metadata_history_floor()}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold tabular-nums">
              <PriceDisplay usd={last.floorUsd} />
            </span>
            {points.length > 1 && (
              <>
                <Delta from={first.floorUsd} to={last.floorUsd} />
                <span className="text-xxs text-muted-foreground">
                  {m.objekt_metadata_history_vs({
                    date: formatDay(first.date),
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        <Tabs
          value={range}
          // SAFETY: tab values are the PriceHistoryRange variants
          onValueChange={(value) => setRange(value as PriceHistoryRange)}
        >
          <TabsList className="h-7">
            {priceHistoryRanges.map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-2 font-mono text-xxs"
              >
                {RANGE_LABELS[value]()}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {points.length > 1 ? (
        <PriceHistoryChart points={points} />
      ) : (
        <p className="flex h-40 items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
          {m.objekt_metadata_history_empty()}
        </p>
      )}
    </div>
  );
}

function Delta({ from, to }: { from: number; to: number }) {
  const percent = ((to - from) / from) * 100;
  const up = percent >= 0;

  return (
    <span
      className={cn(
        "rounded-sm px-1.5 font-mono text-xxs font-semibold tabular-nums",
        up
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-red-500/10 text-red-500",
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}
