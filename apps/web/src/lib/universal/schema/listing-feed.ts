import { validArtists, validOnlineTypes } from "@apollo/cosmo/types/common";
import { listingIdSchema, listingTypes } from "@apollo/trades/listing";
import { columnValue } from "@apollo/trades/range";
import * as z from "zod";

/**
 * The most values one filter column takes, whether parsed from a URL or
 * sent to the feed's server fn. Anything longer hits HTTP limits anyway,
 * and this guards against oversized IN clauses.
 */
export const MAX_FILTER_VALUES = 12;

/**
 * An artist in any casing, lowercased to how the indexer and the trade
 * tables store it.
 */
export const feedArtistSchema = z
  .string()
  .transform((value) =>
    validArtists.find((artist) => artist.toLowerCase() === value.toLowerCase()),
  )
  .pipe(z.enum(validArtists))
  .transform((artist) => artist.toLowerCase());

/**
 * The values each feed column accepts, sized to the trade tables' columns.
 */
export const feedColumnValues = {
  season: columnValue(32),
  member: columnValue(32),
  class: columnValue(8),
  on_offline: z.enum(validOnlineTypes),
};

const values = <TSchema extends z.ZodType<string>>(schema: TSchema) =>
  z.array(schema).max(MAX_FILTER_VALUES).optional();

const feedSideSchema = z.strictObject({
  season: values(feedColumnValues.season),
  member: values(feedColumnValues.member),
  class: values(feedColumnValues.class),
  on_offline: values(feedColumnValues.on_offline),
  artist: values(feedArtistSchema),
});

export type ListingFeedSide = z.input<typeof feedSideSchema>;

/**
 * One page of the Listings feed. Offering narrows on the objekts a listing
 * offers and Looking for on its want rows; `artists` is the navbar's
 * selection, which narrows the Offering side. The page size is the
 * server's, so a caller can't ask for an unbounded read.
 */
export const listingFeedInputSchema = z.strictObject({
  filters: z.strictObject({
    offering: feedSideSchema,
    lookingFor: feedSideSchema,
  }),
  type: z.enum(listingTypes).nullable(),
  artists: z.array(feedArtistSchema).max(validArtists.length),
  cursor: listingIdSchema.optional(),
});

export type ListingFeedInput = z.infer<typeof listingFeedInputSchema>;

// the header's count of the listings the feed's filters match
export const listingFeedTotalInputSchema = listingFeedInputSchema.omit({
  cursor: true,
});

export type ListingFeedTotalInput = z.infer<typeof listingFeedTotalInputSchema>;
