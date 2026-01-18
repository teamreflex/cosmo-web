import {
  validArtists,
  validOnlineTypes,
  validSorts,
} from "@apollo/cosmo/types/common";
import * as z from "zod";
import { transferTypes } from "./transfers";

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
    serial: z.coerce.number().nullish(),
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
    serial: z.coerce.number().nullish(),
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
  .extend({
    serial: z.coerce.number().nullish(),
  })
  .partial();

// objekt list backend
export const objektListBackendSchema = cosmoSchema
  .omit({ transferable: true, gridable: true })
  .extend({
    page: z.coerce.number().default(0),
    artists: z.string().array().default([]),
  });

// transfers frontend
export const transfersFrontendSchema = cosmoSchema
  .pick({
    member: true,
    artist: true,
    season: true,
    class: true,
    on_offline: true,
  })
  .extend({
    type: z.enum(transferTypes).nullish(),
  })
  .partial();

// transfers backend
export const transfersBackendSchema = cosmoSchema
  .pick({
    member: true,
    artist: true,
    season: true,
    class: true,
    on_offline: true,
  })
  .extend({
    address: z.string(),
    cursor: z.string().nullish(),
    type: z.enum(transferTypes).default("all"),
    artists: z.string().array().default([]),
  });

// progress frontend
export const progressFrontendSchema = cosmoSchema
  .pick({
    member: true,
    artist: true,
  })
  .extend({
    season: z.string().nullish(),
    filter: z.enum(validOnlineTypes).nullish(),
    leaderboard: z.coerce.boolean().nullish(),
  })
  .partial();

// progress leaderboard backend
export const progressLeaderboardBackendSchema = z.object({
  onlineType: z.enum(validOnlineTypes).nullish().default(null),
  season: z.string().nullish().default(null),
});

/**
 * Ensures extra query params are removed and don't trigger queryKey changes.
 */
export function normalizeFilters(data: z.infer<typeof cosmoSchema>) {
  return {
    sort: data.sort,
    season: data.season,
    class: data.class,
    on_offline: data.on_offline,
    member: data.member,
    artist: data.artist,
    transferable: data.transferable,
    gridable: data.gridable,
    collectionNo: data.collectionNo,
  };
}
