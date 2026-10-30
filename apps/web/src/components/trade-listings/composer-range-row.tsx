import type { SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { formatCount, onOfflineLabel } from "@/lib/client/trade-listings";
import { rangeMatchCountQuery } from "@/lib/queries/trade-listings";
import { artistName } from "@/lib/universal/objekt-conversion";
import {
  applyChipUpdate,
  type RangeFormFilter,
  rangeIsNarrowed,
  rangeOverCap,
  rangeToChipFilters,
} from "@/lib/universal/trade-listing-form";
import { cn } from "@/lib/utils";
import { wantSummaryParts } from "@apollo/trades/composer";
import {
  MAX_RANGE_VALUES,
  type RangeFilter,
  rangeFilterSchema,
} from "@apollo/trades/range";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconChevronDown, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  type ReactNode,
  Suspense,
  useDeferredValue,
  useId,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useDebounceValue } from "usehooks-ts";
import FilterArtistChip from "../collection/filter-artist-chip";
import ClassFilter from "../collection/filter-class";
import FilterMemberChip from "../collection/filter-member-chip";
import OnlineFilter from "../collection/filter-online";
import SeasonFilter from "../collection/filter-season";
import CollectionFilter from "../objekt-index/collection-filter";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

type Props = {
  /** the row's place among the wants, from 1, naming its remove button */
  position: number;
  count: number;
  filter: RangeFormFilter;
  error: string | undefined;
  stepper: ReactNode;
  /** whether the row carries the note that ranges take offers, which the first one does */
  offersNote: boolean;
  onChange: (filter: RangeFormFilter) => void;
  onRemove: () => void;
};

/**
 * A want row for any objekts in a range, which starts open. Open, it shows
 * the filter chips; collapsed, only the values that narrow it. Both show the
 * summary and how many collections the range covers. The first range row
 * also says that a listing with a range takes offers rather than trading at
 * once, across its foot.
 */
export default function ComposerRangeRow({
  position,
  count,
  filter,
  error,
  stepper,
  offersNote,
  onChange,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const chipsId = useId();
  const chips = rangeToChipFilters(filter);
  const summary = wantSummaryParts(
    { count, filter },
    { artist: artistName, onOffline: onOfflineLabel },
  );

  // the schema files an over-full column's issue on the column, which `error` doesn't carry
  const shownError = rangeOverCap(filter)
    ? m.listing_composer_reason_range_too_many({ max: MAX_RANGE_VALUES })
    : error;

  const setFilters: SetCosmoFilters = (input) =>
    onChange(
      applyChipUpdate(filter, input instanceof Function ? input(chips) : input),
    );

  return (
    <div className="flex flex-col rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-3 p-3 md:p-3.5">
        {/* below sm the count and its words drop under the badge and buttons */}
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <Badge variant="outline">{m.listing_detail_kind_range()}</Badge>
          <span className="flex min-w-0 flex-1 items-center gap-2 max-sm:order-last max-sm:basis-full md:gap-2.5">
            {stepper}
            <span className="min-w-0 text-sm leading-tight">
              {m.listing_composer_matching({ count })}
            </span>
          </span>
          <span className="flex shrink-0 items-center max-sm:ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-expanded={expanded}
              aria-controls={chipsId}
              aria-label={
                expanded
                  ? m.listing_composer_range_collapse()
                  : m.listing_composer_range_edit()
              }
              onClick={() => setExpanded((open) => !open)}
              className="text-muted-foreground"
            >
              <IconChevronDown
                className={cn("transition-transform", expanded && "rotate-180")}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={m.listing_composer_remove_row({
                position,
                row: `${summary.count} ${summary.label || m.listing_detail_kind_range()}`,
              })}
              onClick={onRemove}
              className="text-muted-foreground"
            >
              <IconX />
            </Button>
          </span>
        </div>

        {expanded && (
          <div id={chipsId} className="flex flex-wrap gap-2">
            <ErrorBoundary fallback={<ChipsSkeleton />}>
              <Suspense fallback={<ChipsSkeleton />}>
                <FilterArtistChip
                  artist={chips.artist}
                  onChange={setFilters}
                  allArtists
                  unsetLabel={m.filter_value_any()}
                />
                <FilterMemberChip
                  members={chips.member}
                  artist={chips.artist}
                  onChange={setFilters}
                  allArtists
                  scopeToArtist
                  unsetLabel={m.filter_value_any()}
                />
                <CollectionFilter
                  collections={chips.collectionNo}
                  onChange={setFilters}
                  unsetLabel={m.filter_value_any()}
                />
                <SeasonFilter
                  seasons={chips.season}
                  artist={chips.artist}
                  onChange={setFilters}
                  allArtists
                  scopeToArtist
                  unsetLabel={m.filter_value_any()}
                />
                <ClassFilter
                  classes={chips.class}
                  artist={chips.artist}
                  onChange={setFilters}
                  allArtists
                  scopeToArtist
                  unsetLabel={m.filter_value_any()}
                />
                <OnlineFilter
                  onOffline={chips.on_offline}
                  onChange={setFilters}
                  label={m.filter_type()}
                  unsetLabel={m.filter_value_any()}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          {/* one run of text, so a wrapped line never starts on a separator */}
          <span className="min-w-0 break-words">
            {summary.label.length > 0 && (
              <span dir="auto" className="font-semibold">
                <span className="font-mono tabular-nums">{summary.count}</span>{" "}
                {summary.label}
              </span>
            )}
            <MatchCount filter={filter} separated={summary.label.length > 0} />
          </span>
          {!expanded && <NarrowedBadges filter={filter} />}
        </div>

        {shownError !== undefined && (
          <p role="alert" className="text-sm text-destructive">
            {shownError}
          </p>
        )}
      </div>

      {offersNote && (
        <p className="flex gap-2.5 rounded-b-lg border-t border-blue-500/30 bg-blue-500/5 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground md:px-3.5">
          <IconInfoCircle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400"
          />
          <span>
            <ParaglideMessage
              message={m.listing_composer_range_offers}
              markup={{
                b: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
              }}
            />
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * How many collections the range covers, once the chips settle. A range
 * that covers none can't be posted, so that reads as a warning. After the
 * summary, a non-breaking space keeps the separator off the start of a
 * wrapped line.
 */
function MatchCount({
  filter,
  separated,
}: {
  filter: RangeFormFilter;
  separated: boolean;
}) {
  const parsed = rangeFilterSchema.safeParse(filter);
  const [settled] = useDebounceValue<RangeFilter | null>(
    parsed.success ? parsed.data : null,
    300,
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  // the last count stays up while the next one loads
  const shown = useDeferredValue(settled);
  const gap = separated ? " " : "";
  const skeleton = (
    <>
      {gap}
      <Skeleton className="inline-block h-4 w-28 align-middle" />
    </>
  );

  if (!parsed.success) {
    // a narrowed range the schema refuses says why in the row's error
    return rangeIsNarrowed(filter) ? null : (
      <span className="text-xs text-muted-foreground">
        {gap}
        {m.listing_composer_range_empty()}
      </span>
    );
  }
  if (shown === null) return skeleton;
  return (
    <ErrorBoundary fallback={null} resetKeys={[shown]}>
      <Suspense fallback={skeleton}>
        <SettledCount filter={shown} separated={separated} />
      </Suspense>
    </ErrorBoundary>
  );
}

function SettledCount({
  filter,
  separated,
}: {
  filter: RangeFilter;
  separated: boolean;
}) {
  const { data } = useSuspenseQuery(rangeMatchCountQuery(filter));

  return data === 0 ? (
    <span className="text-xs text-amber-700 dark:text-amber-500">
      {separated && " "}
      {m.listing_composer_range_no_matches()}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground tabular-nums">
      {separated && "\u00a0· "}
      {m.listing_composer_range_matches({
        count: data,
        formatted: formatCount(data),
      })}
    </span>
  );
}

/**
 * The narrowed columns as "Season · Atom02" badges, for a collapsed row.
 */
function NarrowedBadges({ filter }: { filter: RangeFormFilter }) {
  const columns = [
    [m.market_listings_filter_artist(), (filter.artist ?? []).map(artistName)],
    [m.market_listings_filter_member(), filter.member ?? []],
    [m.filter_collections(), filter.collectionNo ?? []],
    [m.common_season(), filter.season ?? []],
    [m.common_class(), filter.class ?? []],
    [m.filter_type(), (filter.on_offline ?? []).map(onOfflineLabel)],
  ] satisfies [string, string[]][];

  return columns
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => {
      const text = `${label} · ${values.join(" / ")}`;
      // a long column truncates in place of overflowing a phone's sheet
      return (
        <Badge
          key={label}
          variant="secondary"
          dir="auto"
          title={text}
          className="max-w-full justify-start"
        >
          <span className="min-w-0 truncate">{text}</span>
        </Badge>
      );
    });
}

function ChipsSkeleton() {
  return Array.from({ length: 6 }, (_, i) => (
    <Skeleton key={i} className="h-8 w-24" />
  ));
}
