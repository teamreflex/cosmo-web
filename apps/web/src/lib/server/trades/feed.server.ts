import {
  lockedObjekts,
  tradeListingWantOptions,
  tradeListingWants,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import type {
  TradeListingWant,
  TradeListingWantOption,
  TradeOfferItem,
} from "@apollo/database/web/types";
import { rangeColumns } from "@apollo/trades/range";
import {
  and,
  type AnyColumn,
  arrayOverlaps,
  count,
  eq,
  exists,
  inArray,
  isNull,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { Objekt } from "../../universal/objekt-conversion";
import type { ListingFeedInput } from "../../universal/schema/listing-feed";
import {
  type ListingFeedItem,
  type ListingFeedWant,
  storedObjektItemSchema,
  storedWantSchema,
} from "../../universal/trade-listings";
import { indexer } from "../db/indexer";
import { readIndexerTokens, type TokenState } from "./holdings.server";

const qb = new QueryBuilder();

/**
 * Written as a literal matching the feed indexes' WHERE, so a generic plan
 * can still prove the partial indexes apply.
 */
const openListing = sql`${tradeOffers.kind} = 'listing' AND ${tradeOffers.status} = 'open'`;

const offeredColumns = {
  season: { listing: tradeOffers.seasons, item: tradeOfferItems.season },
  member: { listing: tradeOffers.members, item: tradeOfferItems.member },
  class: { listing: tradeOffers.classes, item: tradeOfferItems.class },
  on_offline: {
    listing: tradeOffers.onOfflines,
    item: tradeOfferItems.onOffline,
  },
  artist: { listing: tradeOffers.artists, item: tradeOfferItems.artist },
};

const wantColumns = {
  season: {
    exact: tradeListingWants.season,
    range: tradeListingWants.seasons,
    option: tradeListingWantOptions.season,
  },
  member: {
    exact: tradeListingWants.member,
    range: tradeListingWants.members,
    option: tradeListingWantOptions.member,
  },
  class: {
    exact: tradeListingWants.class,
    range: tradeListingWants.classes,
    option: tradeListingWantOptions.class,
  },
  on_offline: {
    exact: tradeListingWants.onOffline,
    range: tradeListingWants.onOfflines,
    option: tradeListingWantOptions.onOffline,
  },
  artist: {
    exact: tradeListingWants.artist,
    range: tradeListingWants.artists,
    option: tradeListingWantOptions.artist,
  },
};

type FeedSide = ListingFeedInput["filters"]["offering"];

// the narrowed columns of one side; an empty column doesn't narrow
function narrowed(side: FeedSide) {
  return rangeColumns.flatMap((column) => {
    const values = side[column] ?? [];
    return values.length ? [{ column, values }] : [];
  });
}

/**
 * Offering: some single offered objekt holds every narrowed value, the
 * navbar's artists included. The listing-level arrays narrow the
 * candidates through their GIN index first; they hold the union over the
 * listing's objekts, so the EXISTS still decides.
 */
function offeringConditions(side: FeedSide, artists: string[]) {
  const columns = narrowed(side);
  if (columns.length === 0 && artists.length === 0) return [];

  const item = and(
    eq(tradeOfferItems.offerId, tradeOffers.id),
    isNull(tradeOfferItems.leftAt),
    ...columns.map(({ column, values }) =>
      inArray(offeredColumns[column].item, values),
    ),
    ...(artists.length ? [inArray(tradeOfferItems.artist, artists)] : []),
  );

  return [
    ...columns.map(({ column, values }) =>
      arrayOverlaps(offeredColumns[column].listing, values),
    ),
    ...(artists.length ? [arrayOverlaps(tradeOffers.artists, artists)] : []),
    exists(
      qb.select({ id: tradeOfferItems.id }).from(tradeOfferItems).where(item),
    ),
  ];
}

/**
 * Looking for: some single want row holds every narrowed value. Exact rows
 * match on their copied values; a range column matches when it's empty
 * (any value) or shares one; a choice row matches when one of its
 * collections holds them all, so a member of one collection and the season
 * of another don't add up. The payment row never matches.
 */
function lookingForConditions(side: FeedSide) {
  const columns = narrowed(side);
  if (columns.length === 0) return [];

  const exact = and(
    eq(tradeListingWants.kind, "exact"),
    ...columns.map(({ column, values }) =>
      inArray(wantColumns[column].exact, values),
    ),
  );
  const range = and(
    eq(tradeListingWants.kind, "range"),
    ...columns.map(({ column, values }) => {
      const stored = wantColumns[column].range;
      return or(sql`${stored} = '{}'`, arrayOverlaps(stored, values));
    }),
  );
  const choice = and(
    eq(tradeListingWants.kind, "choice"),
    exists(
      qb
        .select({ slug: tradeListingWantOptions.slug })
        .from(tradeListingWantOptions)
        .where(
          and(
            eq(tradeListingWantOptions.wantId, tradeListingWants.id),
            ...columns.map(({ column, values }) =>
              inArray(wantColumns[column].option, values),
            ),
          ),
        ),
    ),
  );

  return [
    exists(
      qb
        .select({ id: tradeListingWants.id })
        .from(tradeListingWants)
        .where(
          and(
            eq(tradeListingWants.listingId, tradeOffers.id),
            or(exact, range, choice),
          ),
        ),
    ),
  ];
}

const liveCopy = alias(tradeOfferItems, "live_copy");

/**
 * How many of the listing's pool objekts are free, as an int: no live trade
 * holds them and the poster hasn't locked them. At most MAX_OFFERED pool
 * rows, each probing trade_offer_items_live_token_idx, whose WHERE the bare
 * `live` matches, and address_token_idx, so it's selected for the rows a
 * page returns and never filters on. `listing` is the listing's columns,
 * aliased or not.
 */
export function freePoolCount(listing: {
  id: AnyColumn;
  fromAddress: AnyColumn;
}) {
  return sql<number>`(${qb
    .select({ free: count() })
    .from(tradeOfferItems)
    .where(
      and(
        eq(tradeOfferItems.offerId, listing.id),
        isNull(tradeOfferItems.leftAt),
        notExists(
          qb
            .select({ id: liveCopy.id })
            .from(liveCopy)
            .where(
              and(
                eq(liveCopy.tokenId, tradeOfferItems.tokenId),
                sql`${liveCopy.live}`,
              ),
            ),
        ),
        notExists(
          qb
            .select({ id: lockedObjekts.id })
            .from(lockedObjekts)
            .where(
              and(
                eq(lockedObjekts.address, listing.fromAddress),
                eq(lockedObjekts.tokenId, tradeOfferItems.tokenId),
                eq(lockedObjekts.locked, true),
              ),
            ),
        ),
      ),
    )})::int`.mapWith(Number);
}

/**
 * How many objekts the listing has ever offered, the pool and the ones
 * that left it, as an int (hasRatio()). `listingId` is the listing's id
 * column, aliased or not.
 */
export function postedCount(listingId: AnyColumn) {
  return sql<number>`(${qb
    .select({ posted: count() })
    .from(tradeOfferItems)
    .where(eq(tradeOfferItems.offerId, listingId))})::int`.mapWith(Number);
}

/**
 * Which open listings the feed shows, narrowed by the filters, however much
 * of their pool live trades hold. Values within a column are ORed and
 * columns ANDed, each side on one objekt or want row. `type` doesn't narrow
 * yet: every listing is a trade until sales add the payment side.
 * Arrays bind through `arrayOverlaps` and `inArray` only.
 */
export function listingFeedWhere(
  input: Pick<ListingFeedInput, "filters" | "artists">,
) {
  return and(
    openListing,
    ...offeringConditions(input.filters.offering, input.artists),
    ...lookingForConditions(input.filters.lookingFor),
  );
}

/**
 * The indexer's collections for every slug the page names, and the state
 * of each of its tokens: the serial to show, and the owner and
 * transferability that decide whether it can still be given.
 */
export async function readIndexed(slugs: string[], tokenIds: number[]) {
  const collectionRows = slugs.length
    ? await indexer.query.collections.findMany({
        where: { slug: { in: slugs } },
      })
    : [];
  const states = tokenIds.length
    ? await readIndexerTokens(tokenIds)
    : new Map<number, TokenState>();
  return {
    collections: new Map(
      collectionRows.map((row) => [row.slug, Objekt.fromIndexer(row)]),
    ),
    states,
  };
}

/**
 * An offered objekt with the serial and collection the indexer knows for
 * it, or null for either it doesn't.
 */
export function feedItem(
  item: Pick<ListingFeedItem, "tokenId" | "attributes">,
  indexed: Awaited<ReturnType<typeof readIndexed>>,
): ListingFeedItem {
  const state = indexed.states.get(item.tokenId);
  return {
    ...item,
    serial: state?.kind === "found" ? state.serial : null,
    collection: indexed.collections.get(item.attributes.slug) ?? null,
  };
}

/**
 * A listing's want rows as storedWantSchema reads them, for a relational
 * query: in posted (id) order, each choice row with its collections.
 */
export const storedWants = {
  orderBy: { id: "asc" },
  with: { options: { orderBy: { slug: "asc" } } },
} as const;

/**
 * A listing's stored items and wants, as the relational query reads them.
 */
type StoredParts = {
  items: TradeOfferItem[];
  wants: (TradeListingWant & { options: TradeListingWantOption[] })[];
};

/**
 * Parses each listing's stored items and wants and fills in what the
 * indexer knows: every objekt's serial and the collection behind each
 * offered objekt, exact want and choice row's option. Wants keep their
 * posted (id) order. The token states come back too, for judging the
 * poster's side.
 */
export async function hydrateListings<T extends StoredParts>(
  rows: T[],
): Promise<{
  listings: (Omit<T, keyof StoredParts> & {
    items: ListingFeedItem[];
    wants: ListingFeedWant[];
  })[];
  states: ReadonlyMap<number, TokenState>;
}> {
  const listings = rows.map(({ items, wants, ...rest }) => ({
    rest,
    items: items.map((item) => storedObjektItemSchema.parse(item)),
    wants: wants.map((want) => storedWantSchema.parse(want)),
  }));
  const indexed = await readIndexed(
    [
      ...new Set(
        listings.flatMap((listing) => [
          ...listing.items.map((item) => item.attributes.slug),
          ...listing.wants.flatMap((want) => {
            switch (want.kind) {
              case "exact":
                return [want.objekt.slug];
              case "choice":
                return want.options.map((option) => option.slug);
              case "range":
              case "payment":
                return [];
            }
          }),
        ]),
      ),
    ],
    [
      ...new Set(
        listings.flatMap((listing) =>
          listing.items.map((item) => item.tokenId),
        ),
      ),
    ],
  );

  return {
    states: indexed.states,
    listings: listings.map((listing) => ({
      ...listing.rest,
      items: listing.items.map((item) => feedItem(item, indexed)),
      wants: listing.wants.map((want): ListingFeedWant => {
        switch (want.kind) {
          case "exact":
            return {
              ...want,
              collection: indexed.collections.get(want.objekt.slug) ?? null,
            };
          case "choice":
            return {
              ...want,
              options: want.options.map((option) => ({
                ...option,
                collection: indexed.collections.get(option.slug) ?? null,
              })),
            };
          case "range":
          case "payment":
            return want;
        }
      }),
    })),
  };
}
