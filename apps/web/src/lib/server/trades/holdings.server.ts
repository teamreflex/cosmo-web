import { collections, objekts } from "@apollo/database/indexer/schema";
import { lockedObjekts, tradeOfferItems } from "@apollo/database/web/schema";
import type { TradeWant } from "@apollo/trades/allocate";
import { type TokenFlags, tokenRefusal } from "@apollo/trades/holdings";
import { orderInventory } from "@apollo/trades/inventory";
import type { ListingInput } from "@apollo/trades/listing";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import { addr, isEqual } from "@apollo/util";
import {
  and,
  eq,
  inArray,
  isNull,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import type { TokenRefusal } from "../../universal/trade-listings";
import { db, type DbOrTx } from "../db";
import { indexer } from "../db/indexer";
import {
  withClass,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
} from "../objekts/filters.server";

/**
 * A token as the indexer has it, whoever owns it, or missing when the
 * indexer doesn't know the id.
 */
export type TokenState =
  | { kind: "missing"; tokenId: number }
  | {
      kind: "found";
      tokenId: number;
      attributes: ObjektAttributes;
      serial: number;
      owner: string;
      transferable: boolean;
    };

export type TokenHoldings = TokenFlags & {
  states: ReadonlyMap<number, TokenState>;
};

/**
 * Reads every token's indexer state, whoever owns it.
 */
export async function readIndexerTokens(
  tokenIds: readonly number[],
): Promise<ReadonlyMap<number, TokenState>> {
  const rows = await indexer
    .select({
      id: objekts.id,
      owner: objekts.owner,
      serial: objekts.serial,
      transferable: objekts.transferable,
      slug: collections.slug,
      artist: collections.artist,
      member: collections.member,
      season: collections.season,
      class: collections.class,
      onOffline: collections.onOffline,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(inArray(objekts.id, tokenIds.map(String)));

  const found = new Map(rows.map((row) => [Number(row.id), row]));
  return new Map(
    tokenIds.map((tokenId): [number, TokenState] => {
      const row = found.get(tokenId);
      if (!row) return [tokenId, { kind: "missing", tokenId }];
      const { id: _, owner, serial, transferable, ...attributes } = row;
      return [
        tokenId,
        { kind: "found", tokenId, attributes, serial, owner, transferable },
      ];
    }),
  );
}

/**
 * Reads every token's indexer state, plus the address's locks and the live
 * trade items among them, without locking anything. Live items of trades
 * from `editedListing` don't count, as readWebTokenFlags says.
 */
export async function readTokenStates(
  address: string,
  tokenIds: readonly number[],
  editedListing?: string,
): Promise<TokenHoldings> {
  const [states, flags] = await Promise.all([
    readIndexerTokens(tokenIds),
    readWebTokenFlags(db, address, tokenIds, editedListing),
  ]);
  return { states, ...flags };
}

/**
 * Reads the address's locks and the live trade items among the tokens, in
 * one statement. Safe inside a transaction. An edit passes its listing as
 * `editedListing`, so an objekt live in one of the listing's own trades can
 * stay in its pool, where it's free again if that trade is cancelled.
 */
export async function readWebTokenFlags(
  executor: DbOrTx,
  address: string,
  tokenIds: readonly number[],
  editedListing?: string,
): Promise<TokenFlags> {
  const rows = await executor
    .select({
      tokenId: sql<number>`${lockedObjekts.tokenId}`.as("token_id"),
      flag: sql<"locked" | "live">`'locked'`.as("flag"),
    })
    .from(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.address, address),
        eq(lockedObjekts.locked, true),
        inArray(lockedObjekts.tokenId, [...tokenIds]),
      ),
    )
    .unionAll(
      executor
        .select({
          tokenId: sql<number>`${tradeOfferItems.tokenId}`.as("token_id"),
          flag: sql<"locked" | "live">`'live'`.as("flag"),
        })
        .from(tradeOfferItems)
        .where(
          and(
            eq(tradeOfferItems.live, true),
            inArray(tradeOfferItems.tokenId, [...tokenIds]),
            editedListing === undefined
              ? undefined
              : or(
                  isNull(tradeOfferItems.listingId),
                  ne(tradeOfferItems.listingId, editedListing),
                ),
          ),
        ),
    );
  return {
    locked: new Set(
      rows.flatMap((row) => (row.flag === "locked" ? [row.tokenId] : [])),
    ),
    live: new Set(
      rows.flatMap((row) => (row.flag === "live" ? [row.tokenId] : [])),
    ),
  };
}

/**
 * The locks the addresses hold on the tokens and the tokens' live trade
 * items, in one statement, for judging several addresses' tokens at once:
 * the returned function gives readWebTokenFlags' answer for one of them.
 * Naming the addresses lets the locks probe address_token_idx.
 */
export async function readSharedTokenFlags(
  executor: DbOrTx,
  tokenIds: readonly number[],
  addresses: readonly string[],
) {
  const rows = await executor
    .select({
      tokenId: sql<number>`${lockedObjekts.tokenId}`.as("token_id"),
      address: sql<string | null>`${lockedObjekts.address}`.as("address"),
    })
    .from(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.locked, true),
        inArray(lockedObjekts.address, [...addresses]),
        inArray(lockedObjekts.tokenId, [...tokenIds]),
      ),
    )
    .unionAll(
      executor
        .select({
          tokenId: sql<number>`${tradeOfferItems.tokenId}`.as("token_id"),
          address: sql<string | null>`null`.as("address"),
        })
        .from(tradeOfferItems)
        .where(
          and(
            eq(tradeOfferItems.live, true),
            inArray(tradeOfferItems.tokenId, [...tokenIds]),
          ),
        ),
    );
  const live = new Set(
    rows.flatMap((row) => (row.address === null ? [row.tokenId] : [])),
  );
  return (address: string): TokenFlags => ({
    locked: new Set(
      rows.flatMap((row) =>
        row.address !== null && isEqual(row.address, address)
          ? [row.tokenId]
          : [],
      ),
    ),
    live,
  });
}

/**
 * Every refused token, in the order the tokens were submitted.
 */
export function tokenRefusals(
  tokenIds: readonly number[],
  holdings: TokenHoldings,
  address: string,
): TokenRefusal[] {
  return tokenIds.flatMap((tokenId) => {
    const state = holdings.states.get(tokenId) ?? {
      kind: "missing",
      tokenId,
    };
    const reason = tokenRefusal(state, address, holdings);
    return reason === null
      ? []
      : [{ kind: "token_unavailable", tokenId, reason }];
  });
}

/**
 * The first refused token, in the order the tokens were submitted.
 */
export function firstRefusal(
  tokenIds: readonly number[],
  holdings: TokenHoldings,
  address: string,
): TokenRefusal | null {
  return tokenRefusals(tokenIds, holdings, address)[0] ?? null;
}

/**
 * The objekt-index conditions for the collections a range covers.
 */
function rangeConditions(filter: RangeFilter) {
  return and(
    ...withSelectedArtists(filter.artist),
    ...withMember(filter.member),
    ...withSeason(filter.season),
    ...withClass(filter.class),
    ...withOnlineType(filter.on_offline),
  );
}

/**
 * How many collections a range matches, using the objekt index's filters.
 */
export function countRangeMatches(filter: RangeFilter) {
  return indexer.$count(collections, rangeConditions(filter));
}

/**
 * A posted want with exact and choice rows resolved to their collections'
 * indexer values.
 */
export type ResolvedWant =
  | { kind: "exact"; count: number; objekt: ObjektAttributes }
  | { kind: "range"; count: number; filter: RangeFilter }
  | { kind: "choice"; count: number; options: ObjektAttributes[] };

/**
 * The collections the wants name: an exact row's, and every one a choice
 * row offers.
 */
function wantSlugs(wants: readonly TradeWant[]) {
  return wants.flatMap((want) => {
    switch (want.kind) {
      case "exact":
        return [want.slug];
      case "range":
        return [];
      case "choice":
        return want.slugs;
    }
  });
}

/**
 * Resolves exact and choice rows to their collections and checks every
 * range matches at least one, so a listing can't ask for something nobody
 * could give. The first bad row, in posted order, decides the refusal.
 */
export async function resolveWants(
  wants: ListingInput["wants"],
): Promise<ResolvedWant[]> {
  const slugs = wantSlugs(wants);
  const ranges = wants.flatMap((want, index) =>
    want.kind === "range" ? [{ index, filter: want.filter }] : [],
  );
  const rows = await indexer
    .select({
      slug: collections.slug,
      artist: collections.artist,
      member: collections.member,
      season: collections.season,
      class: collections.class,
      onOffline: collections.onOffline,
    })
    .from(collections)
    .where(inArray(collections.slug, slugs));
  // every range row's match count in one pass over the collections
  const [matched] = ranges.length
    ? await indexer
        .select({
          counts: sql<number[]>`array[${sql.join(
            ranges.map(
              ({ filter }) =>
                sql`count(*) filter (where ${rangeConditions(filter)})`,
            ),
            sql`, `,
          )}]::int[]`,
        })
        .from(collections)
    : [{ counts: [] }];

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const rangeCounts = new Map(
    ranges.map(({ index }, position) => [index, matched?.counts[position]]),
  );
  const known = (slug: string) => {
    const objekt = bySlug.get(slug);
    if (!objekt) {
      throw new ExpectedError("listing_want_unknown" satisfies TradeErrorCode);
    }
    return objekt;
  };
  return wants.map((want, index): ResolvedWant => {
    switch (want.kind) {
      case "exact":
        return { kind: "exact", count: want.count, objekt: known(want.slug) };
      case "range":
        if (rangeCounts.get(index) === 0) {
          throw new ExpectedError(
            "listing_range_empty" satisfies TradeErrorCode,
          );
        }
        return want;
      case "choice":
        return {
          kind: "choice",
          count: want.count,
          options: want.slugs.map(known),
        };
    }
  });
}

/**
 * Tokens the address can't give to the wants right now, in one statement:
 * the ones it locked, and every token a live trade holds among the
 * collections the wants can take, matched on the item's copied collection
 * values. A live token can sit with someone other than its sender, so the
 * live side isn't narrowed by address.
 */
export async function unusableTokens(
  address: string,
  wants: readonly TradeWant[],
): Promise<TokenFlags> {
  const slugs = wantSlugs(wants);
  const rows = await db
    .select({
      tokenId: sql<number | null>`${lockedObjekts.tokenId}`.as("token_id"),
      flag: sql<"locked" | "live">`'locked'`.as("flag"),
    })
    .from(lockedObjekts)
    .where(
      and(eq(lockedObjekts.address, address), eq(lockedObjekts.locked, true)),
    )
    .unionAll(
      db
        .select({
          tokenId: sql<number | null>`${tradeOfferItems.tokenId}`.as(
            "token_id",
          ),
          flag: sql<"locked" | "live">`'live'`.as("flag"),
        })
        .from(tradeOfferItems)
        .where(
          and(
            eq(tradeOfferItems.live, true),
            or(
              slugs.length ? inArray(tradeOfferItems.slug, slugs) : undefined,
              ...wants.flatMap((want) =>
                want.kind === "range" ? [itemRangeConditions(want.filter)] : [],
              ),
            ),
          ),
        ),
    );
  const flagged = (flag: "locked" | "live") =>
    new Set(
      rows.flatMap((row) =>
        row.flag === flag && row.tokenId !== null ? [row.tokenId] : [],
      ),
    );
  return { locked: flagged("locked"), live: flagged("live") };
}

/**
 * A range's conditions on a trade item's copied collection values, as
 * rangeConditions() puts them on the indexer's collections.
 */
function itemRangeConditions(filter: RangeFilter) {
  return and(
    ...(
      [
        [tradeOfferItems.artist, filter.artist],
        [tradeOfferItems.member, filter.member],
        [tradeOfferItems.season, filter.season],
        [tradeOfferItems.class, filter.class],
        [tradeOfferItems.onOffline, filter.on_offline],
      ] as const
    ).flatMap(([column, values]) =>
      values.length ? [inArray(column, values)] : [],
    ),
  );
}

/**
 * The address's usable copies of every collection the wants could take, in
 * the order allocation should spend them (orderInventory). Usable means
 * transferable, not locked and not in a live trade; those are dropped
 * before counting, so `owned` is every usable copy. Copies of a collection
 * are interchangeable to every row and no allocation uses more than `n`
 * (the listing's total wanted count), so only the top `n` of each
 * collection by serial (highest first) come back, which bounds the read for
 * big holders without changing the allocation. A caller that has read
 * unusableTokens() for these wants, or for more, passes them as `unusable`.
 */
export async function readCandidates(
  address: string,
  wants: readonly TradeWant[],
  n: number,
  unusable?: TokenFlags,
) {
  if (wants.length === 0) return [];
  const { locked, live } = unusable ?? (await unusableTokens(address, wants));
  const excluded = [...locked, ...live].map(String);
  const slugs = wantSlugs(wants);
  const usable = indexer.$with("usable").as(
    indexer
      .select({
        tokenId: objekts.id,
        serial: objekts.serial,
        collectionId: objekts.collectionId,
        slug: collections.slug,
        artist: collections.artist,
        member: collections.member,
        season: collections.season,
        class: collections.class,
        onOffline: collections.onOffline,
        owned:
          sql<number>`count(*) over (partition by ${objekts.collectionId})::int`
            .mapWith(Number)
            .as("owned"),
        // left uncast, so Postgres can stop each partition at `n`
        rank: sql<number>`row_number() over (partition by ${objekts.collectionId} order by ${objekts.serial} desc, ${objekts.id}::int)`
          .mapWith(Number)
          .as("rank"),
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(
        and(
          eq(objekts.owner, addr(address)),
          eq(objekts.transferable, true),
          excluded.length ? notInArray(objekts.id, excluded) : undefined,
          or(
            slugs.length ? inArray(collections.slug, slugs) : undefined,
            ...wants.flatMap((want) =>
              want.kind === "range" ? [rangeConditions(want.filter)] : [],
            ),
          ),
        ),
      ),
  );
  const rows = await indexer
    .with(usable)
    .select()
    .from(usable)
    .where(lte(usable.rank, n));

  return orderInventory(
    rows.map(
      ({ tokenId, serial, collectionId, owned, rank, ...attributes }) => ({
        tokenId: Number(tokenId),
        serial,
        collectionId,
        owned,
        rank,
        attributes,
      }),
    ),
  );
}
