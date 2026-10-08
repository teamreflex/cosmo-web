import { useArtists } from "@/hooks/use-artists";
import type { TransferFilters } from "@/hooks/use-transfer-filters";
import { useTransferFilters } from "@/hooks/use-transfer-filters";
import { m } from "@/i18n/messages";
import { groupByDay } from "@/lib/client/transfer-days";
import { transfersQuery } from "@/lib/queries/objekt-queries";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { SpinOutcome, TransferType } from "@/lib/universal/transfers";
import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TransfersFilters } from "../collection/filter-contexts/transfers-filters";
import FiltersContainer from "../collection/filters-container";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Portal from "../portal";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import TransferRow, { TransferHeader } from "./transfer-row";

type Props = {
  cosmo: PublicCosmo;
};

export default function TransfersRenderer({ cosmo }: Props) {
  const { filters, setFilters } = useTransferFilters();
  const type = filters.type ?? "all";

  function setType(value: TransferType) {
    setFilters((prev) => ({
      ...prev,
      type: value,
      // outcomes only apply to spins
      outcome: value === "spin" ? prev.outcome : undefined,
    }));
  }

  function setOutcome(value: SpinOutcome | undefined) {
    setFilters((prev) => ({ ...prev, outcome: value }));
  }

  return (
    <div className="flex flex-col">
      <FiltersContainer>
        <TransfersFilters
          type={type}
          setType={setType}
          outcome={filters.outcome ?? undefined}
          setOutcome={setOutcome}
        />
      </FiltersContainer>

      <div className="container flex flex-col">
        <div className="pt-2">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div className="flex w-full flex-col items-center gap-2">
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                      <IconHeartBroken className="h-12 w-12" />
                      <p>{m.transfer_error_loading()}</p>
                    </div>
                    <Button variant="outline" onClick={resetErrorBoundary}>
                      <IconRefresh className="mr-2" /> {m.common_retry()}
                    </Button>
                  </div>
                )}
              >
                <Suspense fallback={<TransfersSkeleton />}>
                  <Transfers address={cosmo.address} filters={filters} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </div>
      </div>
    </div>
  );
}

type TransfersProps = {
  address: string;
  filters: TransferFilters;
};

/**
 * Offscreen days skip layout and paint, so expanding a row stays smooth with
 * many pages loaded. Their size is estimated until first rendered.
 */
const DAY_HEADER_PX = 37;
const ROW_PX = 77;

function Transfers({ address, filters }: TransfersProps) {
  const { selectedIds } = useArtists();
  const [now] = useState(() => Date.now());
  const query = useSuspenseInfiniteQuery(
    transfersQuery(address, filters, selectedIds),
  );

  const rows = [
    ...new Map(
      query.data.pages.flatMap((p) => p.results).map((row) => [row.id, row]),
    ).values(),
  ];
  const days = groupByDay(rows, now);

  return (
    <div className="flex flex-col overflow-clip rounded-lg border bg-card text-sm">
      <TransferHeader />

      {days.map((day) => (
        <section
          key={day.key}
          aria-label={day.label}
          className="group/day [content-visibility:auto]"
          style={{
            containIntrinsicSize: `auto ${DAY_HEADER_PX + day.rows.length * ROW_PX}px`,
          }}
        >
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 bg-muted/40 px-3.5 py-2 group-not-first-of-type/day:border-t sm:px-4">
            <h3 className="text-sm font-semibold">{day.label}</h3>
            <span className="text-xs text-muted-foreground max-sm:hidden">
              {day.sub}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {day.tally}
            </span>
          </div>
          <ol>
            {day.rows.map((row) => (
              <TransferRow key={row.id} row={row} />
            ))}
          </ol>
        </section>
      ))}

      <Portal to="#pagination">
        <InfiniteQueryNext
          status={query.status}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </div>
  );
}

export function TransfersSkeleton() {
  return (
    <div className="relative">
      <SkeletonGradient />

      <div className="relative flex w-full flex-col overflow-clip rounded-lg border bg-card text-sm">
        <TransferHeader />

        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-19 w-full rounded-none border-t" />
        ))}
      </div>
    </div>
  );
}
