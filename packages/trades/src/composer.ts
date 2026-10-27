import { type ValidArtist, validArtists } from "@apollo/cosmo/types/common";
import { MAX_PER_ROW, MAX_TOTAL_WANTED, MAX_WANT_ROWS } from "./caps";
import type { rangeColumns } from "./range";

type RangeColumn = (typeof rangeColumns)[number];

/**
 * A range row's columns as the composer edits them. A missing or empty
 * column matches any value.
 */
export type ComposerRange = Partial<Record<RangeColumn, readonly string[]>>;

export type ComposerExactWant = { kind: "exact"; slug: string; count: number };

/**
 * The least the composer's reducers need from a want row.
 */
type CountedWant = { kind: string; count: number };

export function totalWanted(wants: readonly CountedWant[]) {
  return wants.reduce((sum, want) => sum + want.count, 0);
}

/**
 * Whether one more row fits: under the row cap and the total cap, since a
 * new row asks for at least one objekt.
 */
export function canAddWant(wants: readonly CountedWant[]) {
  return wants.length < MAX_WANT_ROWS && totalWanted(wants) < MAX_TOTAL_WANTED;
}

/**
 * The rows after adding an exact want, and which row changed: null when
 * nothing fit under the caps.
 */
export type AddedExactWant<TWant> = {
  wants: (TWant | ComposerExactWant)[];
  index: number | null;
};

/**
 * Adds an exact row for the collection, or raises the count of the row that
 * already asks for it, within the caps.
 */
export function addExactWant<TWant extends CountedWant>(
  wants: readonly (TWant | ComposerExactWant)[],
  slug: string,
): AddedExactWant<TWant> {
  const index = wants.findIndex(
    (want) => want.kind === "exact" && "slug" in want && want.slug === slug,
  );

  if (index === -1) {
    return canAddWant(wants)
      ? {
          wants: [...wants, { kind: "exact", slug, count: 1 }],
          index: wants.length,
        }
      : { wants: [...wants], index: null };
  }

  const count = stepCount(wants, index, 1);
  return {
    wants: wants.map((want, i) => (i === index ? { ...want, count } : want)),
    index: count === wants[index]?.count ? null : index,
  };
}

/**
 * The row's count after stepping it by `delta`, kept between one and the
 * per-row cap and within what the listing's total has room for.
 */
export function stepCount(
  wants: readonly CountedWant[],
  index: number,
  delta: number,
) {
  const current = wants[index]?.count ?? 1;
  const room = MAX_TOTAL_WANTED - totalWanted(wants);
  return Math.max(1, Math.min(current + delta, MAX_PER_ROW, current + room));
}

/**
 * Whether stepping the row by `delta` would change it, for disabling the
 * stepper's buttons.
 */
export function canStep(
  wants: readonly CountedWant[],
  index: number,
  delta: number,
) {
  return stepCount(wants, index, delta) !== wants[index]?.count;
}

/**
 * Sets a range row's artist, or clears it for any artist. Members, seasons
 * and classes belong to one artist, so changing it clears them.
 */
export function setRangeArtist<TRange extends ComposerRange>(
  filter: TRange,
  artist: string | null,
): TRange {
  const next = artist === null ? [] : [toStoredArtist(artist)];
  const current = (filter.artist ?? []).map(toStoredArtist);
  if (current.length === next.length && current[0] === next[0]) {
    return filter;
  }
  return { ...filter, artist: next, member: [], season: [], class: [] };
}

/**
 * The artist id the app's pickers use for a stored (lowercase) artist,
 * such as "tripleS" for "triples".
 */
export function toUiArtist(artist: string): ValidArtist | undefined {
  return validArtists.find(
    (valid) => valid.toLowerCase() === artist.toLowerCase(),
  );
}

/**
 * Listings store artists lowercase, as the indexer does.
 */
export function toStoredArtist(artist: string) {
  return artist.toLowerCase();
}

type SummaryLabels = {
  artist: (artist: string) => string;
  onOffline: (value: string) => string;
};

/**
 * A range row's narrowed columns in the order every surface names them:
 * season, artist, member, collection number, class, then on/offline, so
 * "Atom02 · ARTMS · First" reads the same in the composer, the feed and the
 * listing page. Empty columns are left out.
 */
export function rangeSummaryColumns(
  filter: ComposerRange,
  labels: SummaryLabels,
) {
  return [
    filter.season ?? [],
    (filter.artist ?? []).map(labels.artist),
    filter.member ?? [],
    filter.collectionNo ?? [],
    filter.class ?? [],
    (filter.on_offline ?? []).map(labels.onOffline),
  ].filter((values) => values.length > 0);
}

/**
 * A range row as the composer sums it up: its count, "5×", and its narrowed
 * values, "Atom02 · ARTMS · First". Several values in one column read
 * "Atom02 / Binary01". A non-breaking space before each "·" keeps it off
 * the start of a wrapped line.
 */
export function wantSummaryParts(
  want: { count: number; filter: ComposerRange },
  labels: SummaryLabels,
) {
  return {
    count: `${want.count}×`,
    label: rangeSummaryColumns(want.filter, labels)
      .map((values) => values.join(" / "))
      .join("\u00a0· "),
  };
}
