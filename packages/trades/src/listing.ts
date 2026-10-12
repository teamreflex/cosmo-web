import * as z from "zod";
import type { TradeWant } from "./allocate";
import {
  MAX_NOTE_LENGTH,
  MAX_OFFERED,
  MAX_PER_ROW,
  MAX_TOTAL_WANTED,
  MAX_WANT_ROWS,
} from "./caps";
import { totalWanted } from "./composer";
import { pgText, rangeColumns, rangeFilterSchema } from "./range";

// the listing types the feed can show; sales add theirs in a later phase
export const listingTypes = ["trade"] as const;
export type ListingType = (typeof listingTypes)[number];

/**
 * Listing ids are lowercased, so an uppercase id names the same listing
 * everywhere it's compared, not only in Postgres.
 */
export const listingIdSchema = z.uuid().toLowerCase();

// names one listing: the detail, viewer and withdraw server fns take it
export const listingIdInputSchema = z.strictObject({
  listingId: listingIdSchema,
});

// token ids are stored as Postgres integers
const tokenIdSchema = z.int().positive().max(2_147_483_647);

const countSchema = z
  .int()
  .min(1, "A row needs at least one objekt")
  .max(MAX_PER_ROW, `A row can ask for at most ${MAX_PER_ROW} objekts`);

const wantSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("exact"),
    slug: pgText().trim().toLowerCase().min(1).max(255),
    count: countSchema,
  }),
  z.strictObject({
    kind: z.literal("range"),
    filter: rangeFilterSchema,
    count: countSchema,
  }),
]);

const listingFields = {
  offered: z
    .array(z.strictObject({ tokenId: tokenIdSchema }))
    .min(1, "Offer at least one objekt")
    .max(MAX_OFFERED, `A listing can offer at most ${MAX_OFFERED} objekts`),
  wants: z
    .array(wantSchema)
    .min(1, "Ask for at least one objekt")
    .max(MAX_WANT_ROWS, `A listing can have at most ${MAX_WANT_ROWS} rows`),
  note: pgText()
    .trim()
    .max(MAX_NOTE_LENGTH, `A note can be at most ${MAX_NOTE_LENGTH} characters`)
    .nullish()
    .transform((note) => note || null),
};

type ListingTerms = {
  offered: readonly { tokenId: number }[];
  wants: readonly TradeWant[];
};

/**
 * The rules a listing's terms follow whether it's posted or edited: no
 * token offered twice, no row repeated (the composer merges repeats into
 * one row's count), and a bounded total.
 */
function withListingRules<TSchema extends z.ZodType<ListingTerms>>(
  schema: TSchema,
) {
  const isDistinct = (keys: readonly (string | number)[]) =>
    new Set(keys).size === keys.length;

  return schema
    .refine(
      ({ offered }) => isDistinct(offered.map(({ tokenId }) => tokenId)),
      { message: "Each objekt can only be offered once", path: ["offered"] },
    )
    .refine(
      ({ wants }) =>
        isDistinct(
          wants.flatMap((want) => (want.kind === "exact" ? [want.slug] : [])),
        ),
      {
        message: "Ask for each objekt in one row and raise its count instead",
        path: ["wants"],
      },
    )
    .refine(
      ({ wants }) =>
        isDistinct(
          wants.flatMap((want) =>
            want.kind === "range"
              ? [
                  JSON.stringify(
                    rangeColumns.map((column) =>
                      want.filter[column].toSorted((a, b) =>
                        a < b ? -1 : Number(a > b),
                      ),
                    ),
                  ),
                ]
              : [],
          ),
        ),
      {
        message: "Each range can only be asked for once",
        path: ["wants"],
      },
    )
    .refine(({ wants }) => totalWanted(wants) <= MAX_TOTAL_WANTED, {
      message: `A listing can ask for at most ${MAX_TOTAL_WANTED} objekts in total`,
      path: ["wants"],
    });
}

// the composer's offered objekts, checked before Post or Save
export const offeredTokensInputSchema = z.strictObject({
  tokenIds: z.array(tokenIdSchema).min(1).max(MAX_OFFERED),
});

export const listingInputSchema = withListingRules(
  z.strictObject(listingFields),
);
export type ListingInput = z.output<typeof listingInputSchema>;

export const editListingInputSchema = withListingRules(
  z.strictObject({ listingId: listingIdSchema, ...listingFields }),
);
export type EditListingInput = z.output<typeof editListingInputSchema>;

/**
 * Accept: one token list per want row as the picker showed them, and the
 * listing's `updated_at` as the claimer saw it.
 */
export const claimListingInputSchema = z
  .strictObject({
    listingId: listingIdSchema,
    seen: z.date(),
    rows: z
      .array(z.array(tokenIdSchema).min(1).max(MAX_PER_ROW))
      .min(1)
      .max(MAX_WANT_ROWS),
  })
  .refine(({ rows }) => rows.flat().length <= MAX_TOTAL_WANTED, {
    message: `A claim can give at most ${MAX_TOTAL_WANTED} objekts`,
    path: ["rows"],
  });
export type ClaimListingInput = z.output<typeof claimListingInputSchema>;
