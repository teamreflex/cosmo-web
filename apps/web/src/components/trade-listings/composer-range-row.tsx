import { useArtists } from "@/hooks/use-artists";
import type { SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { formatCount, onOfflineLabel } from "@/lib/client/trade-listings";
import { rangeMatchCountQuery } from "@/lib/queries/trade-listings";
import { artistName } from "@/lib/universal/objekt-conversion";
import {
  applyChipUpdate,
  parsedRanges,
  type RangeChipFilters,
  type RangeFormFilter,
  rangeIsNarrowed,
  rangeOverCap,
  rangeToChipFilters,
} from "@/lib/universal/trade-listing-form";
import { cn } from "@/lib/utils";
import { type ArtistValues, wantSummaryParts } from "@apollo/trades/composer";
import {
  MAX_RANGE_CLAUSES,
  MAX_RANGE_VALUES,
  type RangeFilter,
} from "@apollo/trades/range";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconChevronDown,
  IconInfoCircle,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import {
  type ReactNode,
  Suspense,
  useDeferredValue,
  useId,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useDebounceValue } from "usehooks-ts";
import type { ArtistValueToggle } from "../collection/artist-value-toggle";
import ClassFilter from "../collection/filter-class";
import FilterMemberChip from "../collection/filter-member-chip";
import OnlineFilter from "../collection/filter-online";
import SeasonFilter from "../collection/filter-season";
import CollectionFilter from "../objekt-index/collection-filter";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import RangeArtistChip from "./range-artist-chip";

// whether two parsed rows hold the same ranges in the same order
const sameRanges = (a: RangeFilter[] | null, b: RangeFilter[] | null) =>
  JSON.stringify(a) === JSON.stringify(b);

type Props = {
  /** the row's place among the wants, from 1, naming its remove button */
  position: number;
  count: number;
  ranges: RangeFormFilter[];
  /** the schema's issue on the row's ranges as a whole */
  error: string | undefined;
  /** the schema's issue on each range, in the row's order */
  rangeErrors: (string | undefined)[];
  stepper: ReactNode;
  /** whether the row carries the note that ranges take offers, which the first one does */
  offersNote: boolean;
  onChange: (ranges: RangeFormFilter[]) => void;
  onRemove: () => void;
};

/**
 * A want row for any objekts in some of its ranges, which starts open. Open,
 * it shows each range's filter chips, "or" between them, and a button that
 * adds another range; collapsed, only the values that narrow each range.
 * Both show the summary, how many collections the row covers, and which
 * range covers none. The first range row also says that a listing with a
 * range takes offers rather than trading at once, across its foot.
 */
export default function ComposerRangeRow({
  position,
  count,
  ranges,
  error,
  rangeErrors,
  stepper,
  offersNote,
  onChange,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const chipsId = useId();
  const summary = wantSummaryParts(
    { count, ranges },
    { artist: artistName, onOffline: onOfflineLabel, or: m.listing_range_or() },
  );
  const parsed = parsedRanges(ranges);
  const [settled] = useDebounceValue<RangeFilter[] | null>(parsed, 300, {
    equalityFn: sameRanges,
  });
  // the last count stays up while the next one loads
  const shown = useDeferredValue(settled);
  /**
   * Each range's own count, read from what the row's count fetched. It's
   * left out until the counted ranges are the row's current ones, since a
   * removed range would shift the counts onto the wrong ranges.
   */
  const perRange = useQueries({
    queries: (shown === null || !sameRanges(shown, parsed) ? [] : [shown]).map(
      (ranges) => ({
        ...rangeMatchCountQuery(ranges),
        enabled: false,
      }),
    ),
    combine: (results) => results[0]?.data?.perRange,
  });

  // the schema files an over-full column's issue on the column, which `error` doesn't carry
  const shownError = ranges.some(rangeOverCap)
    ? m.listing_composer_reason_range_too_many({ max: MAX_RANGE_VALUES })
    : error;
  const clause = (index: number, body: ReactNode) => (
    <Clause
      key={index}
      index={index}
      body={body}
      empty={perRange?.[index] === 0}
      error={rangeErrors[index]}
      onRemove={
        expanded && ranges.length > 1
          ? () => onChange(ranges.filter((_, i) => i !== index))
          : undefined
      }
    />
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

        <div id={chipsId} className="flex flex-col gap-2">
          {expanded ? (
            <ErrorBoundary fallback={<ChipsSkeleton ranges={ranges.length} />}>
              <Suspense fallback={<ChipsSkeleton ranges={ranges.length} />}>
                <RangeEditors
                  ranges={ranges}
                  clause={clause}
                  onChange={onChange}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            ranges.map((filter, index) =>
              clause(index, <NarrowedBadges filter={filter} />),
            )
          )}
          {expanded && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={ranges.length >= MAX_RANGE_CLAUSES}
                onClick={() => onChange([...ranges, {}])}
                className="border border-dashed border-input max-md:h-10"
              >
                <IconPlus />
                {m.listing_composer_range_add_selection()}
              </Button>
              {ranges.length >= MAX_RANGE_CLAUSES && (
                <span className="text-xs text-muted-foreground">
                  {m.listing_composer_range_or_full({
                    max: MAX_RANGE_CLAUSES,
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* one run of text, so a wrapped line never starts on a separator */}
        <span className="min-w-0 text-sm break-words">
          {summary.label.length > 0 && (
            <span dir="auto" className="font-semibold">
              <span className="font-mono tabular-nums">{summary.count}</span>{" "}
              {summary.label}
            </span>
          )}
          <MatchCount
            ranges={ranges}
            parsed={parsed}
            shown={shown}
            separated={summary.label.length > 0}
          />
        </span>

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
 * One range of the row: "or" above every range but the first, its chips or
 * badges, a remove button while the row has another range, and a line of
 * its own when it covers no collection or the schema refuses it.
 */
function Clause({
  index,
  body,
  empty,
  error,
  onRemove,
}: {
  index: number;
  body: ReactNode;
  empty: boolean;
  error: string | undefined;
  onRemove: (() => void) | undefined;
}) {
  return (
    <>
      {index > 0 && (
        <div className="flex items-center gap-2 text-xxs font-medium tracking-widest text-muted-foreground uppercase">
          <span aria-hidden className="h-px flex-1 bg-border" />
          {m.listing_range_or()}
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">{body}</div>
        {onRemove !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={m.listing_composer_range_remove({
              position: index + 1,
            })}
            onClick={onRemove}
            className="shrink-0 text-muted-foreground"
          >
            <IconX />
          </Button>
        )}
      </div>
      {empty && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          {m.listing_composer_range_no_matches()}
        </p>
      )}
      {error !== undefined && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * Every range's filter chips, sharing what each artist has, so removing an
 * artist from one range drops the values only it had.
 */
function RangeEditors({
  ranges,
  clause,
  onChange,
}: {
  ranges: RangeFormFilter[];
  clause: (index: number, body: ReactNode) => ReactNode;
  onChange: (ranges: RangeFormFilter[]) => void;
}) {
  const { artistList } = useArtists();
  const { seasons, classes } = useFilterData({ allArtists: true });
  // what each artist has, keyed as ranges store artists
  const values: ArtistValues = new Map(
    artistList.map((artist) => [
      artist.id.toLowerCase(),
      {
        member: artist.artistMembers.map((member) => member.name),
        season: seasons.find((s) => s.artist.id === artist.id)?.seasons ?? [],
        class: classes.find((c) => c.artist.id === artist.id)?.classes ?? [],
      },
    ]),
  );

  return ranges.map((filter, index) =>
    clause(
      index,
      <RangeChips
        filter={filter}
        values={values}
        onChange={(next) =>
          onChange(ranges.map((range, i) => (i === index ? next : range)))
        }
      />,
    ),
  );
}

/**
 * One range's filter chips. Artists come from the range's own multi-select
 * chip, and the member, season and class chips list only the picked
 * artists' values.
 */
function RangeChips({
  filter,
  values,
  onChange,
}: {
  filter: RangeFormFilter;
  values: ArtistValues;
  onChange: (filter: RangeFormFilter) => void;
}) {
  const chips = rangeToChipFilters(filter);
  const update = (change: Partial<RangeChipFilters>) =>
    onChange(applyChipUpdate(filter, change, values));
  const setColumns: SetCosmoFilters = (input) =>
    update(input instanceof Function ? input(chips) : input);
  // a season or class picked under an artist the range hasn't picked adds that artist
  const adding = ({ artist, value, values }: ArtistValueToggle) =>
    values.includes(value) && !chips.artists.includes(artist)
      ? { artists: [...chips.artists, artist] }
      : {};

  return (
    <>
      <RangeArtistChip
        artists={chips.artists}
        onChange={(artists) => update({ artists })}
      />
      <FilterMemberChip
        members={chips.member}
        artists={chips.artists}
        onToggle={({ values }) => update({ member: values })}
        onClear={() => update({ member: [] })}
        allArtists
        unsetLabel={m.filter_value_any()}
      />
      <CollectionFilter
        collections={chips.collectionNo}
        onChange={setColumns}
        unsetLabel={m.filter_value_any()}
      />
      <SeasonFilter
        seasons={chips.season}
        artists={chips.artists}
        scoped
        onToggle={(change) =>
          update({ season: change.values, ...adding(change) })
        }
        onClear={() => update({ season: [] })}
        allArtists
        unsetLabel={m.filter_value_any()}
      />
      <ClassFilter
        classes={chips.class}
        artists={chips.artists}
        scoped
        onToggle={(change) =>
          update({ class: change.values, ...adding(change) })
        }
        onClear={() => update({ class: [] })}
        allArtists
        unsetLabel={m.filter_value_any()}
      />
      <OnlineFilter
        onOffline={chips.on_offline}
        onChange={setColumns}
        label={m.filter_type()}
        unsetLabel={m.filter_value_any()}
      />
    </>
  );
}

/**
 * How many collections the row covers, once the chips settle, counting a
 * collection in several ranges once. A row that covers none can't be
 * posted, so that reads as a warning. After the summary, a non-breaking
 * space keeps the separator off the start of a wrapped line.
 */
function MatchCount({
  ranges,
  parsed,
  shown,
  separated,
}: {
  ranges: readonly RangeFormFilter[];
  parsed: RangeFilter[] | null;
  shown: RangeFilter[] | null;
  separated: boolean;
}) {
  const gap = separated ? " " : "";
  const skeleton = (
    <>
      {gap}
      <Skeleton className="inline-block h-4 w-28 align-middle" />
    </>
  );

  if (parsed === null) {
    // ranges the schema refuses for another reason say why in the row's error or the footer
    return ranges.every(rangeIsNarrowed) ? null : (
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
        <SettledCount ranges={shown} separated={separated} />
      </Suspense>
    </ErrorBoundary>
  );
}

function SettledCount({
  ranges,
  separated,
}: {
  ranges: RangeFilter[];
  separated: boolean;
}) {
  const { data } = useSuspenseQuery(rangeMatchCountQuery(ranges));

  return data.total === 0 ? (
    <span className="text-xs text-amber-700 dark:text-amber-500">
      {separated && " "}
      {m.listing_composer_range_no_matches()}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground tabular-nums">
      {separated && " · "}
      {m.listing_composer_range_matches({
        count: data.total,
        formatted: formatCount(data.total),
      })}
    </span>
  );
}

/**
 * One range's narrowed columns as "Season · Atom02" badges, for a
 * collapsed row.
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

function ChipsSkeleton({ ranges }: { ranges: number }) {
  return Array.from({ length: ranges }, (_, range) => (
    <div key={range} className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-8 w-24" />
      ))}
    </div>
  ));
}
