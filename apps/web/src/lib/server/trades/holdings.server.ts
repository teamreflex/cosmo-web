import { collections, objekts } from "@apollo/database/indexer/schema";
import { lockedObjekts, tradeOfferItems } from "@apollo/database/web/schema";
import type { TradeWant } from "@apollo/trades/allocate";
import { orderInventory } from "@apollo/trades/inventory";
import type { ListingInput } from "@apollo/trades/listing";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import { addr } from "@apollo/util";
import { and, eq, inArray, lte, notInArray, or, sql } from "drizzle-orm";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import type {
  TokenRefusal,
  TokenRefusalReason,
} from "../../universal/trade-listings";
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

/**
 * Which of a set of tokens the address has locked, and which any accepted
 * or disputed trade holds.
 */
export type TokenFlags = {
  locked: ReadonlySet<number>;
  live: ReadonlySet<number>;
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
 * trade items among them, without locking anything.
 */
export async function readTokenStates(
  address: string,
  tokenIds: readonly number[],
): Promise<TokenHoldings> {
  const [states, flags] = await Promise.all([
    readIndexerTokens(tokenIds),
    readWebTokenFlags(db, address, tokenIds),
  ]);
  return { states, ...flags };
}

/**
 * Reads the address's locks and the live trade items among the tokens. Safe
 * inside a transaction: the two reads run one after the other.
 */
export async function readWebTokenFlags(
  executor: DbOrTx,
  address: string,
  tokenIds: readonly number[],
): Promise<TokenFlags> {
  const locked = await executor
    .selectDistinct({ tokenId: lockedObjekts.tokenId })
    .from(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.address, address),
        eq(lockedObjekts.locked, true),
        inArray(lockedObjekts.tokenId, [...tokenIds]),
      ),
    );
  const live = await executor
    .select({ tokenId: tradeOfferItems.tokenId })
    .from(tradeOfferItems)
    .where(
      and(
        eq(tradeOfferItems.live, true),
        inArray(tradeOfferItems.tokenId, [...tokenIds]),
      ),
    );

  return {
    locked: new Set(locked.map((row) => row.tokenId)),
    live: new Set(live.flatMap((row) => row.tokenId ?? [])),
  };
}

/**
 * Why the address can't offer the token, checked in a fixed order, or null
 * when it can. Ownership comes first, so a refusal never reveals anything
 * about a token the address doesn't hold.
 */
function tokenRefusal(
  state: TokenState,
  address: string,
  flags: TokenFlags,
): TokenRefusalReason | null {
  if (state.kind === "missing" || state.owner !== addr(address)) {
    return "not_owned";
  }
  if (!state.transferable) return "untransferable";
  if (flags.locked.has(state.tokenId)) return "locked";
  if (flags.live.has(state.tokenId)) return "live";
  return null;
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
 * A posted want with exact rows resolved to their collection's indexer
 * values.
 */
export type ResolvedWant =
  | { kind: "exact"; count: number; objekt: ObjektAttributes }
  | { kind: "range"; count: number; filter: RangeFilter };

/**
 * Resolves exact rows to their collection and checks every range matches at
 * least one, so a listing can't ask for something nobody could give. The
 * first bad row, in posted order, decides the refusal.
 */
export async function resolveWants(
  wants: ListingInput["wants"],
): Promise<ResolvedWant[]> {
  const slugs = wants.flatMap((want) =>
    want.kind === "exact" ? [want.slug] : [],
  );
  const [rows, rangeCounts] = await Promise.all([
    indexer
      .select({
        slug: collections.slug,
        artist: collections.artist,
        member: collections.member,
        season: collections.season,
        class: collections.class,
        onOffline: collections.onOffline,
      })
      .from(collections)
      .where(inArray(collections.slug, slugs)),
    Promise.all(
      wants.map(async (want) =>
        want.kind === "range" ? await countRangeMatches(want.filter) : null,
      ),
    ),
  ]);

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return wants.map((want, index): ResolvedWant => {
    if (want.kind === "range") {
      if (rangeCounts[index] === 0) {
        throw new ExpectedError("listing_range_empty" satisfies TradeErrorCode);
      }
      return want;
    }
    const objekt = bySlug.get(want.slug);
    if (!objekt) {
      throw new ExpectedError("listing_want_unknown" satisfies TradeErrorCode);
    }
    return { kind: "exact", count: want.count, objekt };
  });
}

/**
 * Tokens the address can't give right now: the ones it locked, and every
 * token an accepted or disputed trade holds.
 */
async function unusableTokens(address: string) {
  const [locked, live] = await Promise.all([
    db
      .selectDistinct({ tokenId: lockedObjekts.tokenId })
      .from(lockedObjekts)
      .where(
        and(eq(lockedObjekts.address, address), eq(lockedObjekts.locked, true)),
      ),
    db
      .select({ tokenId: tradeOfferItems.tokenId })
      .from(tradeOfferItems)
      .where(eq(tradeOfferItems.live, true)),
  ]);
  return [...locked, ...live].flatMap((row) =>
    row.tokenId === null ? [] : [String(row.tokenId)],
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
 * big holders without changing the allocation.
 */
export async function readCandidates(
  address: string,
  wants: readonly TradeWant[],
  n: number,
) {
  if (wants.length === 0) return [];
  const excluded = await unusableTokens(address);
  const slugs = wants.flatMap((want) =>
    want.kind === "exact" ? [want.slug] : [],
  );
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
