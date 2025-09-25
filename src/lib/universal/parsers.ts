import { z } from "zod";
import { validArtists, validOnlineTypes, validSorts } from "./cosmo/common";

/**
 * COSMO expects comma-separated values for array filters like:
 * - `?season=Atom01,Binary01`
 * URLSearchParams.getAll() returns `Atom01,Binary01` as it expects arrays in the format of:
 * - `?season=Atom01&season=Binary01`
 * Provides a helper function to cast the value to an array before running it through validation.
 */
export function castToArray<TSchema extends z.Schema>(schema: TSchema) {
  return z.preprocess((val) => {
    if (Array.isArray(val)) return val;

    const str = String(val);
    if (str === "") return [];
    return str.includes(",") ? str.split(",") : [str];
  }, z.array(schema));
}

/**
 * Base schema for querying objekts.
 */
export const cosmoSchema = z.object({
  sort: z.enum(validSorts).nullish(),
  season: castToArray(z.string()).nullish(),
  class: castToArray(z.string()).nullish(),
  on_offline: castToArray(z.enum(validOnlineTypes)).nullish(),
  member: z.string().nullish(),
  artist: z.enum(validArtists).nullish(),
  transferable: z.coerce.boolean().nullish(),
  gridable: z.coerce.boolean().nullish(),
  collectionNo: castToArray(z.string()).nullish(),
});

// index page frontend - user facing, validated by the router
export const objektIndexFrontendSchema = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    id: z.string().nullish(),
    search: z.string().nullish(),
  })
  .partial();

// index page backend
export const objektIndexBackendSchema = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    page: z.coerce.number().default(0),
    artists: z.string().array().default([]),
  });

// user collection frontend - user facing, validated by the router
export const userCollectionFrontendSchema = cosmoSchema
  .omit({ gridable: true })
  .extend({
    locked: z.boolean().nullish(),
  })
  .partial();

// user collection backend
export const userCollectionBackendSchema = cosmoSchema
  .omit({ gridable: true })
  .extend({
    page: z.coerce.number().default(0),
    artists: z.string().array().default([]),
  });

// objekt list frontend - user facing, validated by the router
export const objektListFrontendSchema = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .partial();

// objekt list backend
export const objektListBackendSchema = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    page: z.coerce.number().default(0),
    artists: z.string().array().default([]),
  });
