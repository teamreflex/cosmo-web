import { type ObjektAttributes, type RangeFilter, rangeColumns } from "./range";

// the feed narrows each side on the same columns a range row holds
export type FeedColumn = (typeof rangeColumns)[number];

/**
 * One side of the feed's filters. Values within a column are ORed and
 * columns are ANDed; a missing or empty column doesn't narrow.
 */
export type FeedSideFilters = Partial<Record<FeedColumn, readonly string[]>>;

export type ListingFeedFilters = {
  offering: FeedSideFilters;
  lookingFor: FeedSideFilters;
};

/**
 * A listing's want row as the feed reads it: an exact row's copied
 * collection values, a range's columns, or the payment side.
 */
export type FeedWantRow =
  | { kind: "exact"; objekt: ObjektAttributes }
  | { kind: "range"; filter: RangeFilter }
  | { kind: "payment" };

const attributeOf = {
  season: "season",
  member: "member",
  class: "class",
  on_offline: "onOffline",
  artist: "artist",
} as const satisfies Record<FeedColumn, keyof ObjektAttributes>;

/**
 * The narrowed columns, with artists lowercased since the indexer stores
 * them lowercase. Every other column compares verbatim.
 */
function narrowed(filters: FeedSideFilters) {
  return rangeColumns.flatMap((column) => {
    const values = filters[column] ?? [];
    if (values.length === 0) return [];
    return [
      {
        column,
        values: new Set(
          column === "artist" ? values.map((v) => v.toLowerCase()) : values,
        ),
      },
    ];
  });
}

const normalise = (column: FeedColumn, value: string) =>
  column === "artist" ? value.toLowerCase() : value;

/**
 * Whether a listing shows under the Offering filters: one of its objekts
 * satisfies every narrowed column on its own.
 */
export function matchesOffering(
  filters: FeedSideFilters,
  items: readonly ObjektAttributes[],
) {
  const columns = narrowed(filters);
  if (columns.length === 0) return true;
  return items.some((item) =>
    columns.every(({ column, values }) =>
      values.has(normalise(column, item[attributeOf[column]])),
    ),
  );
}

/**
 * Whether a listing shows under the Looking for filters: one of its objekt
 * rows satisfies every narrowed column. An exact row matches on its
 * collection's values; a range row matches where its column is empty or
 * shares a value. The payment side never matches.
 */
export function matchesLookingFor(
  filters: FeedSideFilters,
  wants: readonly FeedWantRow[],
) {
  const columns = narrowed(filters);
  if (columns.length === 0) return true;
  return wants.some((want) => {
    switch (want.kind) {
      case "payment":
        return false;
      case "exact":
        return columns.every(({ column, values }) =>
          values.has(normalise(column, want.objekt[attributeOf[column]])),
        );
      case "range":
        return columns.every(({ column, values }) => {
          const range = want.filter[column];
          return (
            range.length === 0 ||
            range.some((value) => values.has(normalise(column, value)))
          );
        });
    }
  });
}
