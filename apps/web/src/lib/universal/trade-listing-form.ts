import type { ValidArtist } from "@apollo/cosmo/types/common";
import { MAX_CHOICE_OPTIONS, MAX_NOTE_LENGTH } from "@apollo/trades/caps";
import {
  type ArtistValues,
  rangeArtistUnused,
  setRangeArtists,
  toUiArtist,
} from "@apollo/trades/composer";
import {
  choicesDistinct,
  type EditListingInput,
  type ListingInput,
  type listingInputSchema,
  rangesDistinct,
} from "@apollo/trades/listing";
import {
  collapseWholeGroup,
  MAX_RANGE_VALUES,
  type RangeFilter,
  rangeFilterSchema,
  rangeKey,
  rangesSchema,
} from "@apollo/trades/range";
import type { z } from "zod";
import type { cosmoSchema } from "./parsers";
import {
  hasRatio,
  poolItems,
  type RangeMatchCounts,
  type TradeListing,
} from "./trade-listings";

/**
 * The composer's form: the posting input as the composer edits it, before
 * the schema trims and lowercases it. Artists are held lowercase, as
 * listings store them.
 */
export type ListingFormValues = z.input<typeof listingInputSchema>;

export type ListingFormWant = ListingFormValues["wants"][number];

// one range of a range row, as the row's chips edit it
export type RangeFormFilter = Extract<
  ListingFormWant,
  { kind: "range" }
>["ranges"][number];

/**
 * Whether the composer posts a new listing or replaces an open one's terms.
 */
export type ComposerMode =
  { kind: "create" } | { kind: "edit"; listing: TradeListing };

export type ListingSubmission =
  | { kind: "create"; data: ListingInput }
  | { kind: "edit"; data: EditListingInput };

// unitSize is present so a form the ratio set back to a bundle compares equal, and stays clean
export const emptyListingForm: ListingFormValues = {
  offered: [],
  unitSize: undefined,
  wants: [],
  note: "",
};

/**
 * A listing's current terms as the composer's starting values: its pool, not
 * the objekts that left it, its rows, and its unit size if it has a ratio
 * (hasRatio(), against everything it has offered), else none, so a bundle
 * stays a bundle. The unit size isn't held to the pool: tokens sent in a
 * live trade leave the pool while that trade keeps the listing open, which
 * can leave fewer than a trade takes, and Save waits for the poster to
 * lower the ratio or add objekts (composerBlock()). Payment rows can't be
 * posted from the composer, so they aren't carried into it.
 */
export function listingToFormValues(
  listing: Pick<TradeListing, "items" | "wants" | "note" | "unitSize">,
): ListingFormValues {
  return {
    offered: poolItems(listing).map(({ tokenId }) => ({ tokenId })),
    unitSize: hasRatio(listing.unitSize, listing.items.length)
      ? listing.unitSize
      : undefined,
    wants: listing.wants.flatMap((want): ListingFormWant[] => {
      switch (want.kind) {
        case "exact":
          return [{ kind: "exact", slug: want.objekt.slug, count: want.count }];
        case "range":
          return [{ kind: "range", ranges: want.ranges, count: want.count }];
        case "choice":
          return [
            {
              kind: "choice",
              slugs: want.options.map((option) => option.slug),
              count: want.count,
            },
          ];
        case "payment":
          return [];
      }
    }),
    note: listing.note ?? "",
  };
}

/**
 * How many of the offered objekts one trade takes, as the schema reads the
 * form: with no unit size, a bundle, every one of them.
 */
export function formUnitSize(
  values: Pick<ListingFormValues, "offered" | "unitSize">,
) {
  return values.unitSize ?? values.offered.length;
}

/**
 * The unit size once the form offers `offered` objekts. A bundle has none,
 * so it takes the whole pool however the pool changes; a ratio keeps its
 * size as the pool grows and is held to a smaller one, but never below one
 * objekt, so emptying the pool and filling it again keeps it a ratio.
 */
export function followUnitSize(unitSize: number | undefined, offered: number) {
  return unitSize === undefined
    ? undefined
    : Math.min(unitSize, Math.max(offered, 1));
}

/**
 * The unit size the Ratio control steps to: stepping up to the whole pool
 * makes the listing a bundle again.
 */
export function stepUnitSize(next: number, offered: number) {
  return next >= offered ? undefined : next;
}

/**
 * What the composer sends once the schema has checked its values: new
 * terms, or the same terms for the listing being edited. A range naming
 * one artist's whole roster goes as that artist (collapseWholeGroup), after
 * the picking, so picking more members afterwards never runs into it.
 */
export function formValuesToInput(
  values: ListingInput,
  mode: ComposerMode,
  rosters: ReadonlyMap<string, readonly string[]>,
): ListingSubmission {
  const terms = {
    ...values,
    wants: values.wants.map((want) =>
      want.kind === "range"
        ? {
            ...want,
            ranges: want.ranges.map((filter) =>
              collapseWholeGroup(filter, rosters),
            ),
          }
        : want,
    ),
  };
  return mode.kind === "create"
    ? { kind: "create", data: terms }
    : { kind: "edit", data: { ...terms, listingId: mode.listing.id } };
}

type ChipColumns = Pick<
  z.infer<typeof cosmoSchema>,
  "member" | "collectionNo" | "season" | "class" | "on_offline"
>;

/**
 * A range in the shape its filter chips read, with the stored artists
 * turned back into the pickers' ids ("triples" reads "tripleS"). They sit in
 * `artists`, apart from the objekt filters' single `artist`, so a chip
 * sharing those filters' setter can't narrow the row to one artist.
 */
export type RangeChipFilters = ChipColumns & { artists: ValidArtist[] };

export function rangeToChipFilters(filter: RangeFormFilter): RangeChipFilters {
  return {
    artists: (filter.artist ?? []).flatMap(
      (artist) => toUiArtist(artist) ?? [],
    ),
    member: filter.member ?? [],
    collectionNo: filter.collectionNo ?? [],
    season: filter.season ?? [],
    class: filter.class ?? [],
    on_offline: filter.on_offline ?? [],
  };
}

/**
 * A filter chip's change applied to a range. Only the columns the
 * change names move. New artists go through setRangeArtists() first, with
 * `values` saying what each artist has, so a removed artist takes its
 * values with it.
 */
export function applyChipUpdate(
  filter: RangeFormFilter,
  update: Partial<RangeChipFilters>,
  values: ArtistValues,
): RangeFormFilter {
  const next =
    update.artists === undefined
      ? filter
      : setRangeArtists(filter, update.artists, values);

  return {
    ...next,
    ...("member" in update && { member: update.member ?? [] }),
    ...("collectionNo" in update && {
      collectionNo: update.collectionNo ?? [],
    }),
    ...("season" in update && { season: update.season ?? [] }),
    ...("class" in update && { class: update.class ?? [] }),
    ...("on_offline" in update && { on_offline: update.on_offline ?? [] }),
  };
}

/**
 * Whether a range narrows at least one column, which the schema requires.
 */
export function rangeIsNarrowed(filter: RangeFormFilter) {
  return Object.values(filter).some((values) => values.length > 0);
}

/**
 * Whether a column of a range holds more values than the schema takes.
 */
export function rangeOverCap(filter: RangeFormFilter) {
  return Object.values(filter).some(
    (values) => values.length > MAX_RANGE_VALUES,
  );
}

/**
 * A range row's ranges as the schema reads them, which its match count is
 * keyed by, or null while the schema refuses them.
 */
export function parsedRanges(ranges: readonly RangeFormFilter[]) {
  const parsed = rangesSchema.safeParse(ranges);
  return parsed.success ? parsed.data : null;
}

/**
 * Each range row's ranges as the server compares them: parsed by the
 * schema, then collapsed with `rosters` as formValuesToInput() sends them,
 * so a whole roster and its artist read as the same range. A range the
 * schema refuses is left out, since composerBlock() holds Post back for it
 * first.
 */
function sentRanges(
  rows: readonly (readonly RangeFormFilter[])[],
  rosters: ReadonlyMap<string, readonly string[]>,
): RangeFilter[][] {
  return rows.map((ranges) =>
    ranges.flatMap((filter) => {
      const parsed = rangeFilterSchema.safeParse(filter);
      return parsed.success ? [collapseWholeGroup(parsed.data, rosters)] : [];
    }),
  );
}

/**
 * Why the composer holds Post and Save back, for what it can tell before
 * the server refuses it, in the order the form reads. `refused` counts the
 * offered objekts the poster can't offer right now. Each range of a range
 * row follows the schema's rules, and one narrowing members needs one of
 * each of its artists' members (rangeArtistUnused(), against `rosters`).
 * `rangeMatches` holds how many collections the range rows cover, where
 * known: a range that covers none can't be posted, and a row still being
 * counted doesn't hold Post back. Ranges are compared as they'll be sent
 * (sentRanges()): no row holds one range twice, and no two rows hold the
 * same ranges. "Any of" rows follow the schema's rules: two to
 * MAX_CHOICE_OPTIONS collections each, none named twice in a row, and no
 * two rows naming the same ones. `unitSize` is the form's, which an edit
 * prefills unchanged even when the pool has fallen below it.
 */
export function composerBlock({
  offered,
  refused,
  wants,
  unitSize,
  rangeMatches,
  rosters,
  note,
}: {
  offered: number;
  refused: number;
  wants: ListingFormValues["wants"];
  unitSize: number | undefined;
  rangeMatches: readonly (RangeMatchCounts | undefined)[];
  rosters: ReadonlyMap<string, readonly string[]>;
  note: string;
}) {
  if (offered === 0) return "offered";
  if (refused > 0) return "refused";
  if (wants.length === 0) return "wants";
  const rows = wants.flatMap((want) =>
    want.kind === "range" ? [want.ranges] : [],
  );
  const ranges = rows.flat();
  if (!ranges.every(rangeIsNarrowed)) return "range";
  if (ranges.some(rangeOverCap)) return "range_too_many";
  if (ranges.some((filter) => rangeArtistUnused(filter, rosters))) {
    return "range_artist_unused";
  }
  if (rangeMatches.some((counts) => counts?.perRange.includes(0))) {
    return "range_empty";
  }
  const sent = sentRanges(rows, rosters);
  if (sent.some((row) => new Set(row.map(rangeKey)).size < row.length)) {
    return "range_duplicate";
  }
  if (!rangesDistinct(sent)) return "range_repeated";
  const choices = wants.flatMap((want) =>
    want.kind === "choice" ? [want.slugs] : [],
  );
  if (choices.some((slugs) => slugs.length < 2)) return "choice";
  if (choices.some((slugs) => slugs.length > MAX_CHOICE_OPTIONS)) {
    return "choice_too_many";
  }
  if (choices.some((slugs) => new Set(slugs).size < slugs.length)) {
    return "choice_duplicate";
  }
  if (!choicesDistinct(choices)) return "choice_repeated";
  if (unitSize !== undefined && unitSize > offered) return "ratio";
  if (note.trim().length > MAX_NOTE_LENGTH) return "note";
  return null;
}
