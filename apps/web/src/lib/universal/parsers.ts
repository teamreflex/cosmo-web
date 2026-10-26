import {
  type ValidArtist,
  validArtists,
  type ValidOnlineType,
  validOnlineTypes,
  validSorts,
} from "@apollo/cosmo/types/common";
import { toUiArtist } from "@apollo/trades/composer";
import { listingTypes } from "@apollo/trades/listing";
import * as z from "zod";
import { marketListedWindows, marketSorts } from "./market";
import {
  feedColumnValues,
  type ListingFeedSide,
  MAX_FILTER_VALUES,
} from "./schema/listing-feed";
import { spinOutcomes, transferTypes } from "./transfers";

/**
 * Array filters serialize to comma-separated values in the URL (e.g.
 * `?season=Atom01,Binary01`, via the router's stringifySearch). Coerces the parsed
 * value into an array before validation, accepting a real array (legacy JSON-encoded
 * URLs), a comma-separated string, or a single bare value.
 */
export function castToArray<TSchema extends z.ZodType>(schema: TSchema) {
  return z.preprocess((val) => {
    const raw = Array.isArray(val) ? val : String(val).split(",");
    return [...new Set(raw.filter((v) => v !== ""))].slice(
      0,
      MAX_FILTER_VALUES,
    );
  }, z.array(schema));
}

// one artist in any casing
const artistValue = z
  .string()
  .transform(
    (v) => validArtists.find((a) => a.toLowerCase() === v.toLowerCase()) ?? v,
  )
  .pipe(z.enum(validArtists));

// an artist, or null when it isn't one
const artistParam = artistValue.nullish().catch(null);

/**
 * Base schema for querying objekts.
 */
export const cosmoSchema = z.object({
  sort: z.enum(validSorts).nullish().catch(null),
  season: castToArray(z.string()).nullish(),
  class: castToArray(z.string()).nullish(),
  on_offline: castToArray(z.enum(validOnlineTypes)).catch([]).nullish(),
  member: castToArray(z.string()).nullish(),
  artist: artistParam,
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
    page: z.coerce.number().int().nonnegative().default(0),
    artists: z.string().array().default([]),
  });

// market page frontend - the sort is market-specific, prices are in the viewer's currency
export const marketFrontendSchema = cosmoSchema
  .omit({ sort: true, transferable: true, gridable: true })
  .extend({
    sort: z.enum(marketSorts).nullish().catch(null),
    listed: z.enum(marketListedWindows).nullish().catch(null),
    price_min: z.coerce.number().nonnegative().nullish().catch(null),
    price_max: z.coerce.number().nonnegative().nullish().catch(null),
  })
  .partial();

// market keyset cursor - the sort values of the previous page's last row
export const marketCursorSchema = z.object({
  id: z.string(),
  floorUsd: z.number(),
  listingCount: z.number().int(),
  lastListedAt: z.iso.datetime(),
});

// market page backend - the price range arrives as USD floor bounds
export const marketBackendSchema = cosmoSchema
  .omit({ sort: true, transferable: true, gridable: true })
  .extend({
    sort: z.enum(marketSorts).nullish().catch(null),
    listed: z.enum(marketListedWindows).nullish().catch(null),
    minFloorUsd: z.number().optional(),
    maxFloorUsd: z.number().optional(),
    cursor: marketCursorSchema.optional(),
    artists: z.string().array().default([]),
  });

// profile layout - user facing, validated by the router, shared by every profile tab
export const profileFrontendSchema = z.object({
  binder: z.string().optional(),
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
    page: z.coerce.number().int().nonnegative().default(0),
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
    page: z.coerce.number().int().nonnegative().default(0),
    artists: z.string().array().default([]),
  });

/**
 * One Listings feed filter column. A value too long for the trade tables, or
 * an invalid one, drops the column instead of throwing. The router splits
 * on commas after decoding, so `a%2Cb` reads as two values. Dropped keys are
 * undefined rather than null, so the router leaves them out of the URL
 * instead of writing `?season=null`.
 */
const feedColumn = <TSchema extends z.ZodType<string>>(schema: TSchema) =>
  castToArray(schema)
    .nullish()
    .transform((values) => values ?? undefined)
    .catch(undefined);

const feedArtistParam = artistValue.optional().catch(undefined);

/**
 * Listings feed frontend. The unprefixed keys narrow what a listing offers,
 * like the other objekt filters, and the `want_` keys narrow its want rows.
 */
export const listingFeedFrontendSchema = z
  .object({
    season: feedColumn(feedColumnValues.season),
    class: feedColumn(feedColumnValues.class),
    on_offline: feedColumn(feedColumnValues.on_offline),
    member: feedColumn(feedColumnValues.member),
    artist: feedArtistParam,
    want_season: feedColumn(feedColumnValues.season),
    want_class: feedColumn(feedColumnValues.class),
    want_on_offline: feedColumn(feedColumnValues.on_offline),
    want_member: feedColumn(feedColumnValues.member),
    want_artist: feedArtistParam,
    type: z.enum(listingTypes).optional().catch(undefined),
  })
  .partial();

export type ListingFeedSearch = z.infer<typeof listingFeedFrontendSchema>;

type FeedSideSearch = {
  season: readonly string[] | null | undefined;
  member: readonly string[] | null | undefined;
  class: readonly string[] | null | undefined;
  on_offline: readonly ValidOnlineType[] | null | undefined;
  artist: ValidArtist | null | undefined;
};

const sorted = <T extends string>(values: readonly T[]) =>
  [...new Set(values)].toSorted();

/**
 * Only the narrowed columns, each deduped and sorted with the artist
 * lowercased, so equal filters give equal query keys.
 */
function feedSide(search: FeedSideSearch) {
  const side: ListingFeedSide = {};
  if (search.season?.length) side.season = sorted(search.season);
  if (search.member?.length) side.member = sorted(search.member);
  if (search.class?.length) side.class = sorted(search.class);
  if (search.on_offline?.length) side.on_offline = sorted(search.on_offline);
  if (search.artist) side.artist = [search.artist.toLowerCase()];
  return side;
}

/**
 * The Listings feed's filters as the server takes them.
 */
export function normalizeListingFeedFilters(search: ListingFeedSearch) {
  return {
    filters: {
      offering: feedSide({
        season: search.season,
        member: search.member,
        class: search.class,
        on_offline: search.on_offline,
        artist: search.artist,
      }),
      lookingFor: feedSide({
        season: search.want_season,
        member: search.want_member,
        class: search.want_class,
        on_offline: search.want_on_offline,
        artist: search.want_artist,
      }),
    },
    type: search.type ?? null,
  };
}

/**
 * The navbar's artist selection as the feed takes it. The cookie holds
 * whatever COSMO lists, so ids that aren't valid artists drop instead of
 * failing the request.
 */
export function normalizeFeedArtists(selectedArtists: readonly string[]) {
  return sorted(
    selectedArtists.flatMap(
      (artist) => toUiArtist(artist)?.toLowerCase() ?? [],
    ),
  );
}

/**
 * How many feed filter columns narrow either side, for the phone's
 * "Filters (n)" button.
 */
export function countActiveListingFilters(search: ListingFeedSearch) {
  const { offering, lookingFor } = normalizeListingFeedFilters(search).filters;
  return Object.keys(offering).length + Object.keys(lookingFor).length;
}

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
    outcome: z.enum(spinOutcomes).nullish(),
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
    type: z.enum(transferTypes).nullish().default("all"),
    outcome: z.enum(spinOutcomes).nullish(),
    artists: z.string().array().default([]),
  });

// progress frontend - progress/leaderboards are single-member by design
export const progressFrontendSchema = cosmoSchema
  .pick({
    artist: true,
  })
  .extend({
    member: z.string().nullish(),
    season: z.string().nullish(),
    filter: z.enum(validOnlineTypes).nullish(),
    leaderboard: z.coerce.boolean().nullish(),
  })
  .partial();

// grid ledger frontend - one artist at a time, optional member focus
export const gridFrontendSchema = cosmoSchema
  .pick({
    artist: true,
  })
  .extend({
    member: z.string().nullish(),
  })
  .partial();

// progress leaderboard backend
export const progressLeaderboardBackendSchema = z.object({
  onlineType: z.enum(validOnlineTypes).nullish().default(null),
  season: z.string().nullish().default(null),
});

/**
 * Market page equivalent of normalizeFilters: the market sort replaces the
 * cosmo sort and the ownership flags never apply. The price range is left
 * out, since the query sends it converted to USD.
 */
export function normalizeMarketFilters(
  data: z.infer<typeof marketFrontendSchema>,
) {
  return {
    sort: data.sort,
    listed: data.listed,
    season: data.season,
    class: data.class,
    on_offline: data.on_offline,
    member: data.member,
    artist: data.artist,
    collectionNo: data.collectionNo,
  };
}

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

/**
 * Sanitize and validate a UUID string.
 * Discord users will accidentally apply formatting to URLs, resulting in an ID of something like `8043b748-011c-4705-a0a1-eb9d261970ff**`
 * This will error when sent to Postgres, so we need to sanitize it.
 * Lowercases so the result matches ids as Postgres returns them — query cache keys built from both must agree.
 */
export function sanitizeUuid(uuid: string): string | null {
  const schema = z
    .string()
    .transform((val) => val.slice(0, 36).toLowerCase())
    .pipe(z.uuid());

  const result = schema.safeParse(uuid);
  return result.success ? result.data : null;
}
