import { MAX_NOTE_LENGTH } from "@apollo/trades/caps";
import { setRangeArtist, toUiArtist } from "@apollo/trades/composer";
import type {
  EditListingInput,
  ListingInput,
  listingInputSchema,
} from "@apollo/trades/listing";
import { collapseWholeGroup, MAX_RANGE_VALUES } from "@apollo/trades/range";
import type { z } from "zod";
import type { cosmoSchema } from "./parsers";
import type { TradeListing } from "./trade-listings";

/**
 * The composer's form: the posting input as the composer edits it, before
 * the schema trims and lowercases it. Artists are held lowercase, as
 * listings store them.
 */
export type ListingFormValues = z.input<typeof listingInputSchema>;

export type ListingFormWant = ListingFormValues["wants"][number];

export type RangeFormFilter = Extract<
  ListingFormWant,
  { kind: "range" }
>["filter"];

/**
 * Whether the composer posts a new listing or replaces an open one's terms.
 */
export type ComposerMode =
  { kind: "create" } | { kind: "edit"; listing: TradeListing };

export type ListingSubmission =
  | { kind: "create"; data: ListingInput }
  | { kind: "edit"; data: EditListingInput };

export const emptyListingForm: ListingFormValues = {
  offered: [],
  wants: [],
  note: "",
};

/**
 * A listing's current terms as the composer's starting values. Payment rows
 * can't be posted from the composer, so they aren't carried into it.
 */
export function listingToFormValues(
  listing: Pick<TradeListing, "items" | "wants" | "note">,
): ListingFormValues {
  return {
    offered: listing.items.map(({ tokenId }) => ({ tokenId })),
    wants: listing.wants.flatMap((want): ListingFormWant[] => {
      switch (want.kind) {
        case "exact":
          return [{ kind: "exact", slug: want.objekt.slug, count: want.count }];
        case "range":
          return [{ kind: "range", filter: want.filter, count: want.count }];
        case "payment":
          return [];
      }
    }),
    note: listing.note ?? "",
  };
}

/**
 * What the composer sends once the schema has checked its values: new
 * terms, or the same terms for the listing being edited. A range row
 * naming one artist's whole roster goes as that artist (collapseWholeGroup),
 * after the picking, so picking more members afterwards never runs into it.
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
        ? { ...want, filter: collapseWholeGroup(want.filter, rosters) }
        : want,
    ),
  };
  return mode.kind === "create"
    ? { kind: "create", data: terms }
    : { kind: "edit", data: { ...terms, listingId: mode.listing.id } };
}

type ChipFilters = Pick<
  z.infer<typeof cosmoSchema>,
  "artist" | "member" | "season" | "class" | "on_offline"
>;

/**
 * A range row in the shape the objekt filter chips read, with the stored
 * artist turned back into the pickers' id ("triples" reads "tripleS").
 */
export function rangeToChipFilters(filter: RangeFormFilter): ChipFilters {
  const [artist] = filter.artist ?? [];
  return {
    artist: artist === undefined ? null : (toUiArtist(artist) ?? null),
    member: filter.member ?? [],
    season: filter.season ?? [],
    class: filter.class ?? [],
    on_offline: filter.on_offline ?? [],
  };
}

/**
 * A filter chip's change applied to a range row. Only the columns the
 * change names move, and a new artist clears the columns that belong to it.
 */
export function applyChipUpdate(
  filter: RangeFormFilter,
  update: Partial<ChipFilters>,
): RangeFormFilter {
  const next =
    "artist" in update ? setRangeArtist(filter, update.artist ?? null) : filter;

  return {
    ...next,
    ...("member" in update && { member: update.member ?? [] }),
    ...("season" in update && { season: update.season ?? [] }),
    ...("class" in update && { class: update.class ?? [] }),
    ...("on_offline" in update && { on_offline: update.on_offline ?? [] }),
  };
}

/**
 * Whether a range row narrows at least one column, which the schema
 * requires.
 */
export function rangeIsNarrowed(filter: RangeFormFilter) {
  return Object.values(filter).some((values) => values.length > 0);
}

/**
 * Whether a column of a range row holds more values than the schema takes.
 */
export function rangeOverCap(filter: RangeFormFilter) {
  return Object.values(filter).some(
    (values) => values.length > MAX_RANGE_VALUES,
  );
}

/**
 * Why the composer holds Post and Save back, for what it can tell before
 * the server refuses it, in the order the form reads. `refused` counts the
 * offered objekts the poster can't offer right now. `rangeMatches` holds
 * how many collections the range rows cover, where known: a range that
 * covers none can't be posted, and one still being counted doesn't hold
 * Post back. `rangesRepeat` holds when two range rows cover the same
 * collections.
 */
export function composerBlock({
  offered,
  refused,
  wants,
  rangeMatches,
  rangesRepeat,
  note,
}: {
  offered: number;
  refused: number;
  wants: ListingFormValues["wants"];
  rangeMatches: readonly (number | undefined)[];
  rangesRepeat: boolean;
  note: string;
}) {
  if (offered === 0) return "offered";
  if (refused > 0) return "refused";
  if (wants.length === 0) return "wants";
  if (
    wants.some((want) => want.kind === "range" && !rangeIsNarrowed(want.filter))
  ) {
    return "range";
  }
  if (
    wants.some((want) => want.kind === "range" && rangeOverCap(want.filter))
  ) {
    return "range_too_many";
  }
  if (rangeMatches.includes(0)) return "range_empty";
  if (rangesRepeat) return "range_repeated";
  if (note.trim().length > MAX_NOTE_LENGTH) return "note";
  return null;
}
