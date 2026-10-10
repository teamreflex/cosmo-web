import { validArtists, validOnlineTypes } from "@apollo/cosmo/types/common";
import * as z from "zod";

// the most values one column of a range can hold
const MAX_RANGE_VALUES = 12;

const column = <TSchema extends z.ZodType<string>>(schema: TSchema) =>
  z
    .array(schema)
    .max(MAX_RANGE_VALUES)
    .default([])
    .transform((values) => [...new Set(values)]);

/**
 * A range row of a listing's trade side, keyed like the objekt index
 * filters. Values are kept in the indexer's casing, so artists are matched
 * case-insensitively and stored lowercase. An empty column matches any
 * value, and at least one column must narrow the range.
 */
export const rangeFilterSchema = z
  .object({
    artist: column(
      z
        .string()
        .transform((value) =>
          validArtists.find(
            (artist) => artist.toLowerCase() === value.toLowerCase(),
          ),
        )
        .pipe(z.enum(validArtists))
        .transform((artist) => artist.toLowerCase()),
    ),
    member: column(z.string().min(1).max(32)),
    season: column(z.string().min(1).max(32)),
    class: column(z.string().min(1).max(8)),
    on_offline: column(z.enum(validOnlineTypes)),
  })
  .refine((filter) => Object.values(filter).some((values) => values.length), {
    message: "A range needs at least one value",
  });

export type RangeFilter = z.infer<typeof rangeFilterSchema>;

/**
 * The indexer values a listing copies for each objekt it offers or wants.
 */
export type ObjektAttributes = {
  slug: string;
  artist: string;
  member: string;
  season: string;
  class: string;
  onOffline: string;
};

/**
 * Whether the objekt is in the range: every narrowed column holds its value.
 */
export function matchesRange(
  filter: RangeFilter,
  objekt: Omit<ObjektAttributes, "slug">,
) {
  const holds = (values: readonly string[], value: string) =>
    values.length === 0 || values.includes(value);

  return (
    holds(filter.artist, objekt.artist) &&
    holds(filter.member, objekt.member) &&
    holds(filter.season, objekt.season) &&
    holds(filter.class, objekt.class) &&
    holds(filter.on_offline, objekt.onOffline)
  );
}
