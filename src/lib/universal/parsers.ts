import { z } from "zod";
import { validArtists, validOnlineTypes, validSorts } from "./cosmo/common";
import { env } from "@/env";

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
export const cosmoSchema = z.object({
  sort: z.enum(validSorts).optional().default("newest"),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: castToArray(z.enum(validOnlineTypes)),
  member: z.string().optional().nullable(),
  artist: z.enum(validArtists).optional().nullable(),
  transferable: z.coerce.boolean().optional().nullable(),
  gridable: z.coerce.boolean().optional().nullable(),
});

/**
 * Parse COSMO params with default fallback.
 */
export function parseCosmo(params: URLSearchParams) {
  return parse(
    cosmoSchema,
    {
      sort: params.get("sort"),
      season: params.getAll("season"),
      class: params.getAll("class"),
      on_offline: params.getAll("on_offline"),
      member: params.get("member"),
      artist: params.get("artist"),
      transferable: params.get("transferable"),
      gridable: params.get("gridable"),
    },
    {
      sort: "newest",
      season: [],
      class: [],
      on_offline: [],
      member: undefined,
      artist: undefined,
    }
  );
}

/**
 * Objekt index schema.
 * Extends COSMO schema as it has the same filters.
 */
export const objektIndex = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    page: z.coerce.number().optional().default(0),
    collectionNo: castToArray(z.string()).optional().default([]),
    artists: z.string().array().optional().default([]),
  });

/**
 * Parse objekt index params with default fallback.
 */
export function parseObjektIndex(params: URLSearchParams) {
  return parse(
    objektIndex,
    {
      page: params.get("page"),
      sort: params.get("sort"),
      season: params.getAll("season"),
      class: params.getAll("class"),
      on_offline: params.getAll("on_offline"),
      member: params.get("member"),
      artist: params.get("artist"),
      collectionNo: params.getAll("collectionNo"),
      artists: params.getAll("artists"),
    },
    {
      page: 0,
      sort: "newest",
      season: [],
      class: [],
      on_offline: [],
      member: undefined,
      artist: undefined,
      collectionNo: [],
      artists: [],
    }
  );
}

/**
 * Objekt list schema.
 * Extends COSMO & objekt index schema as it has the same filters.
 * Does not add anything but this is in place for future compatibility.
 */
export const objektList = objektIndex.omit({ artists: true });

/**
 * Parse objekt index params with default fallback.
 */
export function parseObjektList(params: URLSearchParams) {
  return parse(
    objektList,
    {
      page: params.get("page"),
      sort: params.get("sort"),
      season: params.getAll("season"),
      class: params.getAll("class"),
      on_offline: params.getAll("on_offline"),
      member: params.get("member"),
      artist: params.get("artist"),
      collectionNo: params.getAll("collectionNo"),
    },
    {
      page: 0,
      sort: "newest",
      season: [],
      class: [],
      on_offline: [],
      member: undefined,
      artist: undefined,
      collectionNo: [],
    }
  );
}

/**
 * User collection schema.
 * Extends COSMO & objekt index schemas as it has the same filters.
 */
export const userCollection = cosmoSchema
  .merge(objektIndex.omit({ artists: true }))
  .extend({
    artists: z.string().array().optional().default([]),
  });

/**
 * Parse user collection params with default fallback.
 */
export function parseUserCollection(params: URLSearchParams) {
  return parse(
    userCollection,
    {
      page: params.get("page"),
      sort: params.get("sort"),
      season: params.getAll("season"),
      class: params.getAll("class"),
      on_offline: params.getAll("on_offline"),
      member: params.get("member"),
      artist: params.get("artist"),
      transferable: params.get("transferable"),
      gridable: params.get("gridable"),
      collectionNo: params.getAll("collectionNo"),
      artists: params.getAll("artists"),
    },
    {
      page: 1,
      sort: "newest",
      season: [],
      class: [],
      on_offline: [],
      member: undefined,
      artist: undefined,
      collectionNo: [],
      artists: [],
    }
  );
}

/**
 * User collection schema for collection groups.
 */
export const userCollectionGroups = cosmoSchema
  .extend({
    artistName: z.enum(validArtists).optional().nullable(),
    order: z.enum(validSorts).optional().default("newest"),
    page: z.coerce.number().optional().default(1),
  })
  .omit({
    artist: true,
    sort: true,
    gridable: true,
  });

/**
 * Parse user collection groups params with default fallback.
 */
export function parseUserCollectionGroups(params: URLSearchParams) {
  return parse(
    userCollectionGroups,
    {
      page: params.get("page"),
      order: params.get("order"),
      season: params.getAll("season"),
      class: params.getAll("class"),
      on_offline: params.getAll("on_offline"),
      member: params.get("member"),
      artistName: params.get("artistName"),
      transferable: params.get("transferable"),
    },
    {
      page: 1,
      order: "newest",
      season: [],
      class: [],
      on_offline: [],
      member: undefined,
      artistName: "artms",
    }
  );
}

/**
 * Parse URLSearchParams with Zod and provide defaults as an optional fallback.
 */
export function parse<TSchema extends z.AnyZodObject>(
  schema: TSchema,
  params: Record<
    keyof z.infer<TSchema>,
    undefined | null | string | number | boolean | string[] | number[]
  >,
  defaults?: z.infer<TSchema>
): z.infer<TSchema> {
  const result = schema.safeParse(params);

  if (result.success) {
    return result.data;
  }

  if (env.NEXT_PUBLIC_VERCEL_ENV === "development") {
    console.error(result.error);
  }

  // provide defaults for safe parsing
  if (defaults) {
    return defaults;
  }

  // provide error if required
  throw result.error;
}
