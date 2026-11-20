import { collections, objekts } from "@apollo/database/indexer/schema";
import {
  lockedObjekts,
  tradeListingWantOptions,
  tradeListingWantRanges,
  tradeListingWants,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import type {
  ListingOfferMode,
  PaymentMethod,
  TradeListingWant,
  TradeListingWantOption,
  TradeListingWantRange,
  TradeOfferItem,
  TradeSide,
} from "@apollo/database/web/types";
import type { TokenFlags } from "@apollo/trades/holdings";
import {
  and,
  type AnyColumn,
  arrayOverlaps,
  count,
  countDistinct,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  ne,
  not,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { Objekt } from "../../universal/objekt-conversion";
import {
  feedColumns,
  type ListingFeedInput,
} from "../../universal/schema/listing-feed";
import {
  type ListingFeedItem,
  type ListingFeedWant,
  type ListingOption,
  listingOptions,
  storedObjektItemSchema,
} from "../../universal/trade-listings";
import { indexer } from "../db/indexer";
import { type TokenState, toTokenStates } from "./holdings.server";

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
    range: tradeListingWantRanges.seasons,
    option: tradeListingWantOptions.season,
  },
  member: {
    exact: tradeListingWants.member,
    range: tradeListingWantRanges.members,
    option: tradeListingWantOptions.member,
  },
  class: {
    exact: tradeListingWants.class,
    range: tradeListingWantRanges.classes,
    option: tradeListingWantOptions.class,
  },
  on_offline: {
    exact: tradeListingWants.onOffline,
    range: tradeListingWantRanges.onOfflines,
    option: tradeListingWantOptions.onOffline,
  },
  artist: {
    exact: tradeListingWants.artist,
    range: tradeListingWantRanges.artists,
    option: tradeListingWantOptions.artist,
  },
};

type FeedSide = ListingFeedInput["filters"]["offering"];

// the narrowed columns of one side; an empty column doesn't narrow
function narrowed(side: FeedSide) {
  return feedColumns.flatMap((column) => {
    const values = side[column] ?? [];
    return values.length ? [{ column, values }] : [];
  });
}

/**
 * Offering: some single offered objekt holds every narrowed value, the
 * navbar's artists included. The listing-level arrays narrow the
 * candidates through their GIN index first; they hold the union over the
 * listing's objekts, so the EXISTS still decides. A buy listing offers no
 * objekt, so it never matches the Offering filters; with only the navbar's
 * artists narrowing, it matches when one of its want rows names one of them
 * (lookingForConditions()).
 */
function offeringConditions(side: FeedSide, artists: string[]) {
  const columns = narrowed(side);
  if (columns.length === 0 && artists.length === 0) return [];
  const offering = offeredConditions(columns, artists);
  if (columns.length > 0) return offering;
  return [
    or(
      and(...offering),
      and(buy, ...lookingForConditions({ artist: artists })),
    ),
  ];
}

// some single offered objekt holds every narrowed value and one of the navbar's artists
function offeredConditions(
  columns: ReturnType<typeof narrowed>,
  artists: string[],
) {
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
 * match on their copied values; a range row matches when one of its ranges
 * holds them all, where a column holds a value when it's empty (any value)
 * or shares one; a choice row matches when one of its collections holds
 * them all. So the season of one range or collection and the member of
 * another don't add up. The payment row never matches.
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
    exists(
      qb
        .select({ position: tradeListingWantRanges.position })
        .from(tradeListingWantRanges)
        .where(
          and(
            eq(tradeListingWantRanges.wantId, tradeListingWants.id),
            ...columns.map(({ column, values }) => {
              const stored = wantColumns[column].range;
              return or(sql`${stored} = '{}'`, arrayOverlaps(stored, values));
            }),
          ),
        ),
    ),
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

const paymentWant = alias(tradeListingWants, "payment_want");

// an objekt row of the listing, in the option `option` when given
function objektWant(option?: AnyColumn) {
  return qb
    .select({ id: tradeListingWants.id })
    .from(tradeListingWants)
    .where(
      and(
        eq(tradeListingWants.listingId, tradeOffers.id),
        ne(tradeListingWants.kind, "payment"),
        ...(option === undefined ? [] : [eq(tradeListingWants.option, option)]),
      ),
    );
}

// a sale: the claimer sends its payment and some option asks for nothing else
const sale = and(
  eq(tradeOffers.paymentSide, "to"),
  exists(
    qb
      .select({ id: paymentWant.id })
      .from(paymentWant)
      .where(
        and(
          eq(paymentWant.listingId, tradeOffers.id),
          eq(paymentWant.kind, "payment"),
          notExists(objektWant(paymentWant.option)),
        ),
      ),
  ),
);

// a buy: the poster sends its payment for up to its most units and offers no objekts
const buy = isNotNull(tradeOffers.maxUnits);

/**
 * Each listing type as SQL, as listingTypesOf() decides it, so a listing
 * matches every type one of its options makes it: a sale when an option
 * asks for nothing but the claimer's payment, a buy when the poster sends
 * nothing but theirs, and a trade when an option asks for objekts, a
 * payment beside them or not.
 */
function typeConditions(type: ListingFeedInput["type"]) {
  switch (type) {
    case null:
      return [];
    case "trade":
      return [
        or(isNull(tradeOffers.paymentSide), not(buy)),
        exists(objektWant()),
      ];
    case "sell":
      return [sale];
    case "buy":
      return [buy];
  }
}

const liveCopy = alias(tradeOfferItems, "live_copy");

// a live copy of the token in any trade, probing trade_offer_items_live_token_idx, whose WHERE the bare `live` matches
function liveCopyOf(tokenId: AnyColumn) {
  return qb
    .select({ id: liveCopy.id })
    .from(liveCopy)
    .where(and(eq(liveCopy.tokenId, tokenId), sql`${liveCopy.live}`));
}

// the address's lock on the token, probing address_token_idx
function lockOf(address: AnyColumn, tokenId: AnyColumn) {
  return qb
    .select({ id: lockedObjekts.id })
    .from(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.address, address),
        eq(lockedObjekts.tokenId, tokenId),
        eq(lockedObjekts.locked, true),
      ),
    );
}

/**
 * How many of the listing's pool objekts are free, as an int: no live trade
 * holds them and the poster hasn't locked them. At most MAX_OFFERED pool
 * rows, each probing both indexes, so it's selected for the rows a page
 * returns and never filters on. `listing` is the listing's columns, aliased
 * or not.
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
        notExists(liveCopyOf(tradeOfferItems.tokenId)),
        notExists(lockOf(listing.fromAddress, tradeOfferItems.tokenId)),
      ),
    )})::int`.mapWith(Number);
}

const itemListing = alias(tradeOffers, "item_listing");

/**
 * Relational extras on a listing's items saying what holds each back
 * beside the indexer, as freePoolCount() judges it: a live copy of its
 * token in any trade (`inTrade`), and a lock on it by the listing's address
 * (`locked`). Only a pool item (`left_at` null) is judged; one that left
 * reads false.
 */
export const poolItemExtras = {
  inTrade: (t: { tokenId: AnyColumn; leftAt: AnyColumn }) =>
    sql<boolean>`(${t.leftAt} is null and ${exists(liveCopyOf(t.tokenId))})`.mapWith(
      Boolean,
    ),
  locked: (t: { tokenId: AnyColumn; offerId: AnyColumn; leftAt: AnyColumn }) =>
    sql<boolean>`(${t.leftAt} is null and ${exists(
      qb
        .select({ id: itemListing.id })
        .from(itemListing)
        .where(
          and(
            eq(itemListing.id, t.offerId),
            exists(lockOf(itemListing.fromAddress, t.tokenId)),
          ),
        ),
    )})`.mapWith(Boolean),
};

/**
 * The flags of a listing's items read with poolItemExtras.
 */
export function poolFlags(
  items: readonly {
    tokenId: number | null;
    inTrade: boolean;
    locked: boolean;
  }[],
): TokenFlags {
  const flagged = (flag: "inTrade" | "locked") =>
    new Set(
      items.flatMap((item) =>
        item[flag] && item.tokenId !== null ? [item.tokenId] : [],
      ),
    );
  return { locked: flagged("locked"), live: flagged("inTrade") };
}

/**
 * How many objekts the listing has ever offered, the pool and the ones
 * that left it, each once, as an int (hasRatio()). `listingId` is the
 * listing's id column, aliased or not.
 */
export function postedCount(listingId: AnyColumn) {
  return sql<number>`(${qb
    .select({ posted: countDistinct(tradeOfferItems.tokenId) })
    .from(tradeOfferItems)
    .where(eq(tradeOfferItems.offerId, listingId))})::int`.mapWith(Number);
}

/**
 * Which open listings the feed shows, narrowed by the filters, however much
 * of their pool live trades hold. Values within a column are ORed and
 * columns ANDed, each side on one objekt or want row, so Looking for
 * matches a listing when any of its options does. `type` narrows on the
 * types its options make it (typeConditions()). Arrays bind through
 * `arrayOverlaps` and `inArray` only.
 */
export function listingFeedWhere(
  input: Pick<ListingFeedInput, "filters" | "artists" | "type">,
) {
  return and(
    openListing,
    ...typeConditions(input.type),
    ...offeringConditions(input.filters.offering, input.artists),
    ...lookingForConditions(input.filters.lookingFor),
  );
}

/**
 * The indexer's collections for every slug the page names, and the state
 * of each of its tokens: the serial to show, and the owner and
 * transferability that decide whether it can still be given. One
 * statement joins the tokens onto their collections, so `slugs` must name
 * every token's collection; a token outside them reads as missing.
 */
export async function readIndexed(slugs: string[], tokenIds: number[]) {
  const rows = slugs.length
    ? await indexer
        .select({
          collection: collections,
          objekt: {
            id: objekts.id,
            owner: objekts.owner,
            serial: objekts.serial,
            transferable: objekts.transferable,
          },
        })
        .from(collections)
        .leftJoin(
          objekts,
          and(
            eq(objekts.collectionId, collections.id),
            inArray(objekts.id, tokenIds.map(String)),
          ),
        )
        .where(inArray(collections.slug, slugs))
    : [];
  return {
    collections: new Map(
      rows.map(({ collection }) => [
        collection.slug,
        Objekt.fromIndexer(collection),
      ]),
    ),
    states: toTokenStates(
      tokenIds,
      rows.flatMap(({ collection, objekt }) =>
        objekt === null
          ? []
          : [
              {
                ...objekt,
                attributes: {
                  slug: collection.slug,
                  artist: collection.artist,
                  member: collection.member,
                  collectionNo: collection.collectionNo,
                  season: collection.season,
                  class: collection.class,
                  onOffline: collection.onOffline,
                },
              },
            ],
      ),
    ),
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
 * A listing's want rows as listingOptions() reads them, for a relational
 * query: in posted (id) order, each choice row with its collections and
 * each range row with its ranges.
 */
export const storedWants = {
  orderBy: { id: "asc" },
  with: {
    options: { orderBy: { slug: "asc" } },
    ranges: { orderBy: { position: "asc" } },
  },
} as const;

/**
 * A listing's stored items and wants, as the relational query reads them.
 */
type StoredParts = {
  id: string;
  paymentSide: TradeSide | null;
  paymentMethods: PaymentMethod[];
  offers: ListingOfferMode | null;
  items: TradeOfferItem[];
  wants: (TradeListingWant & {
    options: TradeListingWantOption[];
    ranges: TradeListingWantRange[];
  })[];
};

/**
 * Parses each listing's stored items and wants and fills in what the
 * indexer knows: every objekt's serial and the collection behind each
 * offered objekt, exact want and choice row's option. Wants come out
 * grouped into the listing's options (listingOptions()), each keeping its
 * posted (id) order and its payment. The token states come back too, for
 * judging the poster's side.
 */
export async function hydrateListings<T extends StoredParts>(
  rows: T[],
): Promise<{
  listings: (Omit<
    T,
    "items" | "wants" | "paymentSide" | "paymentMethods" | "offers"
  > & {
    items: ListingFeedItem[];
    options: ListingOption<ListingFeedWant>[];
  })[];
  states: ReadonlyMap<number, TokenState>;
}> {
  const listings = rows.map(
    ({ items, wants, paymentSide, paymentMethods, offers, ...rest }) => ({
      rest,
      items: items.map((item) => storedObjektItemSchema.parse(item)),
      options: listingOptions(
        { id: rest.id, paymentSide, paymentMethods, offers },
        wants,
      ),
    }),
  );
  const indexed = await readIndexed(
    [
      ...new Set(
        listings.flatMap((listing) => [
          ...listing.items.map((item) => item.attributes.slug),
          ...listing.options.flatMap((option) =>
            option.wants.flatMap((want) => {
              switch (want.kind) {
                case "exact":
                  return [want.objekt.slug];
                case "choice":
                  return want.options.map((choice) => choice.slug);
                case "range":
                  return [];
              }
            }),
          ),
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
      options: listing.options.map((option) => ({
        payment: option.payment,
        wants: option.wants.map((want): ListingFeedWant => {
          switch (want.kind) {
            case "exact":
              return {
                ...want,
                collection: indexed.collections.get(want.objekt.slug) ?? null,
              };
            case "choice":
              return {
                ...want,
                options: want.options.map((choice) => ({
                  ...choice,
                  collection: indexed.collections.get(choice.slug) ?? null,
                })),
              };
            case "range":
              return want;
          }
        }),
      })),
    })),
  };
}
