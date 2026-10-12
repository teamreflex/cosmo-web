import { validArtists, validOnlineTypes } from "@apollo/cosmo/types/common";
import * as z from "zod";

// the most values one column of a range can hold
const MAX_RANGE_VALUES = 12;

/**
 * Text bound for a Postgres text parameter, which can't carry a NUL byte,
 * so those are refused before they reach it.
 */
export const pgText = () =>
  z.string().refine((value) => !value.includes("\0"), {
    message: "Text can't contain a NUL byte",
  });

// directional formatting characters, which no collection value contains
const bidiControls = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

export function hasBidiControl(value: string) {
  return bidiControls.test(value);
}

/**
 * One collection value, such as a member or a season, sized to its column.
 * Values sit side by side wherever a listing is shown, so a bidi control
 * in one would visually reorder the others; those are refused.
 */
export const columnValue = (length: number) =>
  pgText()
    .min(1)
    .max(length)
    .refine((value) => !hasBidiControl(value), {
      message: "Text can't contain bidi control characters",
    });

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
    member: column(columnValue(32)),
    season: column(columnValue(32)),
    class: column(columnValue(8)),
    on_offline: column(z.enum(validOnlineTypes)),
  })
  .refine((filter) => Object.values(filter).some((values) => values.length), {
    message: "A range needs at least one value",
  });

export type RangeFilter = z.infer<typeof rangeFilterSchema>;

export const rangeColumns = [
  "artist",
  "member",
  "season",
  "class",
  "on_offline",
] as const satisfies readonly (keyof RangeFilter)[];

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
