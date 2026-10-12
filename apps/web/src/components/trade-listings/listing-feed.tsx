import { m } from "@/i18n/messages";
import { formatCount } from "@/lib/client/trade-listings";
import type { ListingFeedPage } from "@/lib/universal/trade-listings";
import {
  IconArrowsExchange,
  IconHeartBroken,
  IconRefresh,
} from "@tabler/icons-react";
import {
  type DefaultError,
  type InfiniteData,
  QueryErrorResetBoundary,
  type QueryKey,
  type UseSuspenseInfiniteQueryOptions,
  type UseSuspenseQueryOptions,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Portal from "../portal";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Skeleton } from "../ui/skeleton";
import ListingFeedRow, { ListingFeedHeader } from "./listing-feed-row";

type Props<TQueryKey extends QueryKey> = {
  options: UseSuspenseInfiniteQueryOptions<
    ListingFeedPage,
    DefaultError,
    InfiniteData<ListingFeedPage>,
    TQueryKey,
    string | undefined
  >;
  /**
   * Whether any filter narrows the feed, which the empty state offers to
   * reset.
   */
  filtered: boolean;
  onReset: () => void;
};

export default function ListingFeed<TQueryKey extends QueryKey>(
  props: Props<TQueryKey>,
) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="flex w-full flex-col items-center gap-2 py-12">
              <IconHeartBroken className="size-12" />
              <p>{m.market_listings_error()}</p>
              <Button variant="outline" onClick={resetErrorBoundary}>
                <IconRefresh /> {m.common_retry()}
              </Button>
            </div>
          )}
        >
          <Suspense fallback={<ListingFeedSkeleton />}>
            <Rows {...props} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function Rows<TQueryKey extends QueryKey>({
  options,
  filtered,
  onReset,
}: Props<TQueryKey>) {
  const query = useSuspenseInfiniteQuery(options);
  const rows = [
    ...new Map(
      query.data.pages.flatMap((page) => page.rows).map((row) => [row.id, row]),
    ).values(),
  ];

  if (rows.length === 0) {
    return (
      <Empty className="rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconArrowsExchange />
          </EmptyMedia>
          <EmptyTitle className="text-base">
            {filtered
              ? m.market_listings_empty_filtered()
              : m.market_listings_empty()}
          </EmptyTitle>
          <EmptyDescription>
            {filtered
              ? m.market_listings_empty_filtered_body()
              : m.market_listings_empty_body()}
          </EmptyDescription>
        </EmptyHeader>
        {filtered && (
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={onReset}>
              {m.filter_reset()}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col text-sm md:overflow-clip md:rounded-lg md:border md:bg-card">
      <ListingFeedHeader />

      <ol className="flex flex-col gap-2.5 md:block">
        {rows.map((row) => (
          <ListingFeedRow key={row.id} row={row} />
        ))}
      </ol>

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

type CountProps<TQueryKey extends QueryKey> = {
  options: UseSuspenseQueryOptions<number, DefaultError, number, TQueryKey>;
  filtered: boolean;
};

/**
 * The header's count, an icon and a number as the objekt views show theirs:
 * every open listing, or the ones that match once a filter narrows either
 * side. The navbar's artists narrow it either way.
 */
export function ListingFeedCount<TQueryKey extends QueryKey>(
  props: CountProps<TQueryKey>,
) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={<Skeleton className="h-4 w-12" />}>
        <Count {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function Count<TQueryKey extends QueryKey>({
  options,
  filtered,
}: CountProps<TQueryKey>) {
  const { data: count } = useSuspenseQuery(options);
  const formatted = formatCount(count);

  return (
    <div className="flex h-4 items-center gap-2 text-muted-foreground">
      <IconArrowsExchange aria-hidden className="size-4" />
      <p className="font-mono text-xxs tracking-widest tabular-nums sm:text-xs">
        <span aria-hidden>{formatted}</span>
        <span className="sr-only">
          {filtered
            ? m.market_listings_match_count({ count, formatted })
            : m.market_listings_open_count({ count, formatted })}
        </span>
      </p>
    </div>
  );
}

export function ListingFeedSkeleton() {
  return (
    <div className="relative">
      <SkeletonGradient />

      <div className="relative flex flex-col gap-2.5 md:gap-0 md:overflow-clip md:rounded-lg md:border md:bg-card">
        <ListingFeedHeader />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-44 w-full rounded-[10px] sm:h-29 md:h-23 md:rounded-none md:border-t md:first:border-t-0 lg:h-16"
          />
        ))}
      </div>
    </div>
  );
}
