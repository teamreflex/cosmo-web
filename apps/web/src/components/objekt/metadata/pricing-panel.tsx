import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { useHydrated } from "@/hooks/use-hydrated";
import { m } from "@/i18n/messages";
import { formatDay } from "@/lib/client/time";
import { objektPriceHistoryQuery } from "@/lib/queries/objekt-queries";
import {
  type PriceHistoryRange,
  type PriceStats,
  SPARSE_PRICE_HISTORY,
} from "@/lib/universal/objekts";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState, useTransition } from "react";
import { ErrorBoundary } from "react-error-boundary";
import PriceHistory from "./price-history";

type Props = {
  slug: string;
  data: PriceStats | null;
};

/**
 * The pricing tab: the floor history with the current listing stats, or a
 * note when the collection has never been priced.
 */
export default function PricingPanel({ slug, data }: Props) {
  const [range, setRange] = useState<PriceHistoryRange>("30d");
  // keeps the current range on screen while the next one loads
  const [pending, startTransition] = useTransition();

  return (
    <ErrorBoundary fallback={<Footer stats={data} since={null} />}>
      <Suspense
        fallback={
          <div className="flex h-56 items-center justify-center border-b border-border">
            <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Pricing
          slug={slug}
          stats={data}
          range={range}
          onRangeChange={(next) => startTransition(() => setRange(next))}
          pending={pending}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

type PricingProps = {
  slug: string;
  stats: PriceStats | null;
  range: PriceHistoryRange;
  onRangeChange: (range: PriceHistoryRange) => void;
  pending: boolean;
};

function Pricing(props: PricingProps) {
  const { data: history } = useSuspenseQuery(
    objektPriceHistoryQuery(props.slug, props.range),
  );
  const { tracking } = history;
  const locked = tracking !== null && tracking.snapshots < SPARSE_PRICE_HISTORY;

  // a locked chart shows every snapshot, so fetch the ones outside this range
  if (locked && history.points.length < tracking.snapshots) {
    return <Pricing {...props} range="all" />;
  }

  if (tracking === null && props.stats === null) {
    return (
      <div className="flex flex-col">
        <p className="border-b border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {m.objekt_metadata_pricing_empty()}
        </p>
        <Footer stats={null} since={null} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col transition-opacity",
        props.pending && "opacity-60",
      )}
    >
      <PriceHistory
        history={history}
        stats={props.stats}
        range={locked ? "all" : props.range}
        onRangeChange={props.onRangeChange}
        locked={locked}
      />
      <Footer stats={props.stats} since={tracking?.since ?? null} />
    </div>
  );
}

/**
 * Where the prices come from, when tracking started and when the stats were
 * last updated. Both dates render client-only, since they depend on the
 * viewer's locale and the current time.
 */
function Footer({
  stats,
  since,
}: {
  stats: PriceStats | null;
  since: string | null;
}) {
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-0.5 px-4 py-2 text-xs text-muted-foreground">
      <span>{m.objekt_metadata_pricing_source()}</span>
      {(since !== null || stats !== null) && (
        <span className="flex flex-wrap items-center gap-x-1.5">
          {since !== null &&
            (hydrated ? (
              <span>
                {m.objekt_metadata_history_tracking_since({
                  date: formatDay(since),
                })}
              </span>
            ) : (
              <Skeleton className="h-3 w-24 rounded-full" />
            ))}
          {since !== null && stats !== null && <span aria-hidden>·</span>}
          {stats !== null && <UpdatedAt date={stats.updatedAt} />}
        </span>
      )}
    </div>
  );
}

/**
 * "Updated 2 hours ago", with the relative time wherever each language puts it.
 */
function UpdatedAt({ date }: { date: string }) {
  const [before, after] = m
    .objekt_metadata_pricing_updated({ when: "{when}" })
    .split("{when}");
  return (
    <span>
      {before}
      <Timestamp date={new Date(date)} relative="long" />
      {after}
    </span>
  );
}
