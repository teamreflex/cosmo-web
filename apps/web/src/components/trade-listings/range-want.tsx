import { m } from "@/i18n/messages";
import { formatCount, onOfflineLabel } from "@/lib/client/trade-listings";
import { rangeMatchCountQuery } from "@/lib/queries/trade-listings";
import type { RangeFilter } from "@apollo/trades/range";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../ui/skeleton";
import { ArtistChip, Chip, MemberChip, SeasonsChip } from "./slip-chips";

type BadgesProps = {
  count: number;
  ranges: readonly RangeFilter[];
  /** shows how many collections the row covers, at the row's end */
  matches?: boolean;
};

/**
 * A range want as rows of badges: the count, then each range's badges, "or"
 * between them, and how many collections the row covers.
 */
export function RangeBadges({ count, ranges, matches = true }: BadgesProps) {
  return (
    <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
        <WantCount count={count} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {ranges.map((filter, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
                  {m.listing_range_or()}
                </span>
              )}
              <RangeChips filter={filter} />
            </Fragment>
          ))}
        </div>
      </div>
      {matches && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<Skeleton className="h-4 w-28" />}>
            <MatchCount ranges={ranges} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

/**
 * One range's badges: each group, each season, each member (or any
 * member), collection number, class and on/offline.
 */
function RangeChips({ filter }: { filter: RangeFilter }) {
  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
      {filter.artist.map((artist) => (
        <ArtistChip key={artist} size="md" artist={artist} />
      ))}
      {filter.season.map((season) => (
        <SeasonsChip key={season} size="md" seasons={[season]} />
      ))}
      {filter.member.length === 0 ? (
        <Chip className="text-muted-foreground">
          {m.listing_detail_range_any_member()}
        </Chip>
      ) : (
        filter.member.map((member) => (
          <MemberChip key={member} size="md" member={member} />
        ))
      )}
      {filter.collectionNo.map((value) => (
        <Chip key={value} className="font-mono">
          {value}
        </Chip>
      ))}
      {filter.class.map((value) => (
        <Chip key={value}>{value}</Chip>
      ))}
      {filter.on_offline.map((value) => (
        <Chip key={value}>{onOfflineLabel(value)}</Chip>
      ))}
    </ul>
  );
}

/**
 * An exact want as a range row reads: its count, then one badge naming the
 * collection.
 */
export function ExactBadges({ count, name }: { count: number; name: string }) {
  return (
    <div className="flex min-w-0 flex-auto items-start gap-3">
      <WantCount count={count} />
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <Chip>{name}</Chip>
      </ul>
    </div>
  );
}

function WantCount({ count }: { count: number }) {
  return (
    <span className="min-w-8 shrink-0 font-mono text-lg font-bold text-amber-700 tabular-nums dark:text-amber-500">
      {count}×
    </span>
  );
}

/**
 * How many collections the row covers, the composer's count read again.
 */
function MatchCount({ ranges }: { ranges: readonly RangeFilter[] }) {
  const { data } = useSuspenseQuery(rangeMatchCountQuery(ranges));

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {data.total === 0
        ? m.listing_composer_range_no_matches()
        : m.listing_detail_range_any_of({
            count: data.total,
            formatted: formatCount(data.total),
          })}
    </span>
  );
}
