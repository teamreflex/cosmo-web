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
    const str = String(val);
    if (str === "") return [];
    return str.includes(",") ? str.split(",") : [str];
  }, z.array(schema));
}

/**
 * Cosmo-compatible Zod schema for parsing query params.
 */
const cosmoSchema = z.object({
  sort: z.enum(validSorts).catch("newest"),
  season: castToArray(z.string()),
  class: castToArray(z.string()),
  on_offline: castToArray(z.enum(validOnlineTypes)),
  member: z.string().optional().nullable(),
  artist: z.enum(validArtists).optional().nullable(),
  transferable: z.coerce.boolean().optional().nullable(),
  gridable: z.coerce.boolean().optional().nullable(),
});

/**
 * Objekt index schema.
 * Extends COSMO schema as it has the same filters.
 */
export const objektIndexSearchSchema = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    id: z.string().optional().nullable(),
    search: z.string().optional().nullable().default(""),
    page: z.coerce.number().catch(0),
    collectionNo: castToArray(z.string()).default([]),
    artists: z.string().array().default([]),
  })
  .default({
    // cosmo defaults
    sort: "newest",
    season: [],
    class: [],
    on_offline: [],
    member: undefined,
    artist: undefined,
    // additional defaults
    id: undefined,
    search: "",
    page: 0,
    collectionNo: [],
    artists: [],
  });

/**
 * Objekt list schema.
 * Extends COSMO & objekt index schema as it has the same filters.
 * Does not add anything but this is in place for future compatibility.
 */
export const objektList = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    page: z.coerce.number().catch(0),
    collectionNo: castToArray(z.string()).default([]),
  })
  .default({
    // cosmo defaults
    sort: "newest",
    season: [],
    class: [],
    on_offline: [],
    member: undefined,
    artist: undefined,
    // additional defaults
    page: 0,
    collectionNo: [],
  });

/**
 * User collection schema.
 * Extends COSMO & objekt index schemas as it has the same filters.
 */
export const userCollection = objektIndexSearchSchema;

/**
 * User collection schema for collection groups.
 */
export const userCollectionGroups = cosmoSchema
  .extend({
    artistName: z.enum(validArtists).optional().nullable(),
    order: z.enum(validSorts).optional().catch("newest"),
    page: z.coerce.number().optional().catch(1),
    artists: z.string().array().optional().catch([]),
  })
  .omit({
    artist: true,
    sort: true,
    gridable: true,
  })
  .default({
    // cosmo defaults
    season: [],
    class: [],
    on_offline: [],
    member: undefined,
    // additional defaults
    artistName: undefined,
    order: "newest",
    page: 1,
    artists: [],
  });
