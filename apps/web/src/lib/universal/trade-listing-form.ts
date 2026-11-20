import { toUiArtist, type ValidArtist } from "@apollo/cosmo/types/common";
import type { ListingOfferMode } from "@apollo/database/web/types";
import { MAX_NOTE_LENGTH } from "@apollo/trades/caps";
import {
  type ArtistValues,
  rangeArtistUnused,
  setRangeArtists,
} from "@apollo/trades/composer";
import {
  choicesDistinct,
  type editListingInputSchema,
  type ListingInput,
  type listingInputSchema,
  rangesDistinct,
} from "@apollo/trades/listing";
import { amountSchema, toNumeric } from "@apollo/trades/payment";
import {
  collapseWholeGroup,
  MAX_RANGE_VALUES,
  type RangeFilter,
  rangeFilterSchema,
  rangeKey,
  rangesSchema,
} from "@apollo/trades/range";
import { isDistinct } from "@apollo/util";
import type { z } from "zod";
import type { cosmoSchema } from "./parsers";
import {
  hasRatio,
  listingPaymentTerms,
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

// one option's want rows as the composer edits them
export type ListingFormOption = ListingFormValues["options"][number];

export type ListingFormWant = ListingFormOption[number];

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

/**
 * What the composer sends: the schema's input, which the server parses
 * again, so the payment goes back to the row or field it was typed in.
 */
export type ListingSubmission =
  | { kind: "create"; data: z.input<typeof listingInputSchema> }
  | { kind: "edit"; data: z.input<typeof editListingInputSchema> };

// unitSize is present so a form the ratio set back to a bundle compares equal, and stays clean
export const emptyListingForm: ListingFormValues = {
  offered: [],
  unitSize: undefined,
  maxUnits: undefined,
  options: [[]],
  note: "",
};

/**
 * A listing's current terms as the composer's starting values: its pool, not
 * the objekts that left it, its options' rows, and its unit size if it has
 * a ratio (hasRatio(), against everything it has offered), else none, so a
 * bundle stays a bundle, or a buy listing's most units. The unit size isn't held to the pool: tokens sent
 * in a live trade leave the pool while that trade keeps the listing open,
 * which can leave fewer than a trade takes, and Save waits for the poster
 * to lower the ratio or add objekts (composerBlock()). The claimer's
 * payment comes back as the last want row of each option that asks for
 * it, and the poster's as `offeredPayment`.
 */
export function listingToFormValues(
  listing: Pick<TradeListing, "items" | "options" | "note" | "units">,
): ListingFormValues {
  const terms = listingPaymentTerms(listing.options);
  const { units } = listing;
  return {
    offered: poolItems(listing).map(({ tokenId }) => ({ tokenId })),
    unitSize:
      units.kind === "pool" && hasRatio(units.unitSize, listing.items.length)
        ? units.unitSize
        : undefined,
    maxUnits: units.kind === "buy" ? units.maxUnits : undefined,
    options: listing.options.map(({ wants, payment }) =>
      wants
        .flatMap((want): ListingFormWant[] => {
          switch (want.kind) {
            case "exact":
              return [
                { kind: "exact", slug: want.objekt.slug, count: want.count },
              ];
            case "range":
              return [
                { kind: "range", ranges: want.ranges, count: want.count },
              ];
            case "choice":
              return [
                {
                  kind: "choice",
                  slugs: want.options.map((option) => option.slug),
                  count: want.count,
                },
              ];
          }
        })
        .concat(payment?.side === "to" ? [paymentWant(payment.amount)] : []),
    ),
    offeredPayment:
      terms?.side === "from" && terms.amount !== null
        ? toNumeric(terms.amount)
        : undefined,
    payment:
      terms === null
        ? undefined
        : {
            currency: terms.currency,
            methods: terms.methods,
            mode: terms.mode,
          },
    note: listing.note ?? "",
  };
}

// the claimer's payment row, with no amount when the listing only takes offers
function paymentWant(amount: number | null): ListingFormWant {
  return amount === null
    ? { kind: "payment" }
    : { kind: "payment", amount: toNumeric(amount) };
}

/**
 * The amounts of the claimer's payment rows as typed, one per option that
 * asks for it, in option order. A row has no amount when the listing only
 * takes offers.
 */
export function claimerAmounts(
  options: readonly (readonly ListingFormWant[])[],
) {
  return options.flatMap((wants) =>
    wants.flatMap((want) => (want.kind === "payment" ? [want.amount] : [])),
  );
}

/**
 * Whether the form has a payment on either side: a claimer's row in any
 * option, or the poster's on top.
 */
export function hasFormPayment(
  values: Pick<ListingFormValues, "options" | "offeredPayment">,
) {
  return (
    claimerAmounts(values.options).length > 0 ||
    values.offeredPayment !== undefined
  );
}

// the claimer's payment rows' amounts as the form holds them, and the listing's offer mode
type ClaimerPaymentTerms = {
  amounts: (string | undefined)[];
  mode: ListingOfferMode;
};

/**
 * The claimer's amounts, one per option asking for the payment, and the
 * listing's offer mode once an amount or "Open to offers" changes: closed,
 * each amount is a fixed price; open, each is an asking price, and when
 * every one is empty there is no asking price, so the listing only takes
 * offers. An empty amount beside a typed one stays empty, which Post
 * refuses until it reads.
 */
export function claimerPaymentTerms(
  amounts: readonly string[],
  openToOffers: boolean,
): ClaimerPaymentTerms {
  if (!openToOffers) return { amounts: [...amounts], mode: "price_only" };
  return amounts.every((amount) => amount.trim() === "")
    ? { amounts: amounts.map(() => undefined), mode: "offer_only" }
    : { amounts: [...amounts], mode: "price_or_offer" };
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
 * A buy listing's most units once the form offers `offered` objekts and the
 * poster's payment `offeredPayment`: a payment with no objekts buys, and
 * keeps the units it had or starts at one; anything else buys nothing.
 */
export function followMaxUnits(
  maxUnits: number | undefined,
  {
    offered,
    offeredPayment,
  }: Pick<ListingFormValues, "offered" | "offeredPayment">,
) {
  return offered.length === 0 && offeredPayment !== undefined
    ? (maxUnits ?? 1)
    : undefined;
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
 * the picking, so picking more members afterwards never runs into it. The
 * units go back as the unit size, or a buy listing's most units. The
 * claimer's payment goes back as the last want row of each option that
 * asks for it and the poster's as `offeredPayment`, with its amount at two
 * decimals.
 */
export function formValuesToInput(
  { payment, options, units, ...values }: ListingInput,
  mode: ComposerMode,
  rosters: ReadonlyMap<string, readonly string[]>,
): ListingSubmission {
  const onTop = options[0]?.payment;
  const terms = {
    ...values,
    ...(units.kind === "pool"
      ? { unitSize: units.unitSize }
      : { maxUnits: units.maxUnits }),
    options: options.map((option) => [
      ...option.wants.map((want) =>
        want.kind === "range"
          ? {
              ...want,
              ranges: collapseRanges(want.ranges, rosters),
            }
          : want,
      ),
      ...(option.payment?.side === "to"
        ? [paymentWant(option.payment.amount)]
        : []),
    ]),
    offeredPayment:
      onTop?.side === "from" && onTop.amount !== null
        ? toNumeric(onTop.amount)
        : undefined,
    payment:
      payment === null
        ? undefined
        : {
            currency: payment.currency,
            methods: payment.methods,
            mode: payment.mode,
          },
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
 * The ranges as they're sent: one naming an artist's whole roster goes as
 * that artist (collapseWholeGroup()), so the two read as the same range.
 */
function collapseRanges(
  ranges: readonly RangeFilter[],
  rosters: ReadonlyMap<string, readonly string[]>,
) {
  return ranges.map((filter) => collapseWholeGroup(filter, rosters));
}

/**
 * Why a payment on either side holds Post back: an amount the schema
 * refuses, among the claimer's rows or the poster's, or no method picked.
 * Null without a payment. A listing that only takes offers has no amounts
 * to check, and only it leaves a row's amount out (claimerPaymentTerms()).
 */
function paymentBlock(
  values: Pick<ListingFormValues, "options" | "offeredPayment" | "payment">,
) {
  if (!hasFormPayment(values)) return null;
  const amounts = [
    ...claimerAmounts(values.options),
    ...(values.offeredPayment === undefined ? [] : [values.offeredPayment]),
  ];
  if (
    amounts.some((amount) =>
      amount === undefined ? false : !amountSchema.safeParse(amount).success,
    )
  ) {
    return "payment_amount";
  }
  return (values.payment?.methods.length ?? 0) === 0 ? "payment_methods" : null;
}

/**
 * What an option asks for as one string, the same for the same rows in
 * any order, its ranges as they'll be sent, so the footer can hold back
 * two options asking for the same thing as the schema refuses them.
 */
function optionKey(
  wants: readonly ListingFormWant[],
  rosters: ReadonlyMap<string, readonly string[]>,
) {
  return JSON.stringify(
    wants
      .map((want) => {
        switch (want.kind) {
          case "exact":
            return `exact ${want.count} ${want.slug.trim().toLowerCase()}`;
          case "choice":
            return `choice ${want.count} ${want.slugs
              .map((slug) => slug.trim().toLowerCase())
              .toSorted()
              .join(" ")}`;
          case "range":
            return `range ${want.count} ${JSON.stringify(
              sentRanges(want.ranges, rosters).map(rangeKey).toSorted(),
            )}`;
          case "payment": {
            // amounts compare as the schema reads them, so "3" and "3.00" match
            const parsed = amountSchema.safeParse(want.amount ?? "");
            return `payment ${parsed.success ? parsed.data : (want.amount ?? "")}`;
          }
        }
      })
      .toSorted(),
  );
}

// a row's ranges as they'll be sent, leaving out any the schema refuses
function sentRanges(
  ranges: readonly RangeFormFilter[],
  rosters: ReadonlyMap<string, readonly string[]>,
) {
  return collapseRanges(
    ranges.flatMap((filter) => {
      const parsed = rangeFilterSchema.safeParse(filter);
      return parsed.success ? [parsed.data] : [];
    }),
    rosters,
  );
}

/**
 * Why the composer holds Post and Save back, for what it can tell before
 * the server refuses it, in the order the form reads. A listing offers
 * objekts unless it buys (`maxUnits`). `refused` counts the offered
 * objekts the poster can't offer right now. Every option needs a
 * row (`wants` for a listing's one option, `option_empty` for one of
 * several, which the composer names), and no two may ask for the same
 * thing. Each range of a range row follows the schema's rules, and one
 * narrowing members needs one of each of its artists' members
 * (rangeArtistUnused(), against `rosters`). `rangeMatches` holds how many
 * collections the range rows cover, where known: a range that covers none
 * can't be posted, and a row still being counted doesn't hold Post back.
 * Ranges are compared as they'll be sent (collapseRanges()): no row holds
 * one range twice, and no two rows of an option hold the same ranges. An
 * "any of" row needs two collections, and no two rows of an option may
 * name the same ones; the row itself stops at MAX_CHOICE_OPTIONS and never
 * names one twice. `unitSize` is the form's, which an edit prefills
 * unchanged even when the pool has fallen below it. A payment on either
 * side needs an amount the schema takes and at least one method.
 */
export function composerBlock({
  offered,
  refused,
  options,
  offeredPayment,
  payment,
  unitSize,
  maxUnits,
  rangeMatches,
  rosters,
  note,
}: {
  offered: number;
  refused: number;
  options: ListingFormValues["options"];
  offeredPayment: ListingFormValues["offeredPayment"];
  payment: ListingFormValues["payment"];
  unitSize: number | undefined;
  maxUnits: number | undefined;
  rangeMatches: readonly (RangeMatchCounts | undefined)[];
  rosters: ReadonlyMap<string, readonly string[]>;
  note: string;
}) {
  if (offered === 0 && maxUnits === undefined) return "offered";
  if (refused > 0) return "refused";
  if (options.some((wants) => wants.length === 0)) {
    return options.length === 1 ? "wants" : "option_empty";
  }
  const unpaid = paymentBlock({ options, offeredPayment, payment });
  if (unpaid !== null) return unpaid;
  const rows = options.map((wants) =>
    wants.flatMap((want) => (want.kind === "range" ? [want.ranges] : [])),
  );
  // every range of every range row of every option
  const ranges = rows.flatMap((option) => option.flat());
  if (!ranges.every(rangeIsNarrowed)) return "range";
  if (ranges.some(rangeOverCap)) return "range_too_many";
  if (ranges.some((filter) => rangeArtistUnused(filter, rosters))) {
    return "range_artist_unused";
  }
  if (rangeMatches.some((counts) => counts?.perRange.includes(0))) {
    return "range_empty";
  }
  const sent = rows.map((option) =>
    option.map((row) => sentRanges(row, rosters)),
  );
  if (sent.flat().some((row) => !isDistinct(row.map(rangeKey)))) {
    return "range_duplicate";
  }
  if (!sent.every(rangesDistinct)) return "range_repeated";
  const choices = options.map((wants) =>
    wants.flatMap((want) => (want.kind === "choice" ? [want.slugs] : [])),
  );
  if (choices.flat().some((slugs) => slugs.length < 2)) return "choice";
  if (!choices.every(choicesDistinct)) return "choice_repeated";
  if (!isDistinct(options.map((wants) => optionKey(wants, rosters)))) {
    return "option_repeated";
  }
  if (unitSize !== undefined && unitSize > offered) return "ratio";
  if (note.trim().length > MAX_NOTE_LENGTH) return "note";
  return null;
}
