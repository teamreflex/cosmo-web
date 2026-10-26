import {
  cosmoAccounts,
  tradeOfferItems,
  tradeOffers,
  userFeedbackStats,
} from "@apollo/database/web/schema";
import {
  liveTradeStatuses,
  type TradeOfferStatus,
} from "@apollo/database/web/types";
import { allocate, fitsWant } from "@apollo/trades/allocate";
import type { ClaimStats } from "@apollo/trades/caps";
import { totalWanted } from "@apollo/trades/composer";
import {
  and,
  count,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { Objekt } from "../../universal/objekt-conversion";
import {
  type CandidateRow,
  type ListingPick,
  listingStateSchema,
  type StoredWant,
  toTradeWant,
} from "../../universal/trade-listings";
import { db, type DbOrTx } from "../db";
import { indexer } from "../db/indexer";
import { readCandidates } from "./holdings.server";

const qb = new QueryBuilder();

/**
 * What a user's claim cap is judged on, in one statement: their linked COSMO
 * `address` (null when unlinked), how many claims they hold open (trades
 * they accepted from a listing that are still accepted or disputed; only a
 * claim's trade copies items with a `listing_id`), and the feedback score of
 * their linked address, or 0 before its first scored rating.
 */
export async function claimStanding(
  executor: DbOrTx,
  userId: string,
): Promise<ClaimStats & { address: string | null; active: number }> {
  const link = qb
    .select({ address: cosmoAccounts.address })
    .from(cosmoAccounts)
    .where(eq(cosmoAccounts.userId, userId));
  const [row] = await executor
    .select({
      address: sql<string | null>`(${link})`,
      active: count(),
      score: sql<number>`coalesce((${qb
        .select({ score: userFeedbackStats.score })
        .from(userFeedbackStats)
        .where(inArray(userFeedbackStats.address, link))}), 0)`.mapWith(Number),
    })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.kind, "trade"),
        eq(tradeOffers.toUserId, userId),
        inArray(tradeOffers.status, [...liveTradeStatuses]),
        exists(
          qb
            .select({ id: tradeOfferItems.id })
            .from(tradeOfferItems)
            .where(
              and(
                eq(tradeOfferItems.offerId, tradeOffers.id),
                isNotNull(tradeOfferItems.listingId),
              ),
            ),
        ),
      ),
    );
  return {
    address: row?.address ?? null,
    active: row?.active ?? 0,
    score: row?.score ?? 0,
  };
}

/**
 * The trade a listing led to, with the COSMO username behind the claimer's
 * pinned address: a claimed listing's live trade, or an ended listing's
 * latest trade. A trade from the listing, a claim or an offer on it, keeps
 * the listing's id on the poster's items, and only one that was accepted
 * counts, so an offer that was declined, withdrawn, expired or went stale
 * never names its claimer. A listing has at most one live trade.
 */
async function readListingTrade(listing: {
  id: string;
  status: TradeOfferStatus;
}) {
  if (listing.status === "open") return;
  const [trade] = await db
    .select({
      id: tradeOffers.id,
      status: tradeOffers.status,
      fromUserId: tradeOffers.fromUserId,
      toUserId: tradeOffers.toUserId,
      deadlineAt: tradeOffers.deadlineAt,
      username: cosmoAccounts.username,
    })
    .from(tradeOffers)
    .leftJoin(cosmoAccounts, eq(cosmoAccounts.address, tradeOffers.toAddress))
    .where(
      and(
        eq(tradeOffers.kind, "trade"),
        isNotNull(tradeOffers.acceptedAt),
        listing.status === "claimed"
          ? inArray(tradeOffers.status, [...liveTradeStatuses])
          : undefined,
        exists(
          qb
            .select({ id: tradeOfferItems.id })
            .from(tradeOfferItems)
            .where(
              and(
                eq(tradeOfferItems.offerId, tradeOffers.id),
                eq(tradeOfferItems.listingId, listing.id),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(tradeOffers.createdAt))
    .limit(1);
  return trade;
}

/**
 * The listing's state, and the trade behind it. A claim whose trade is
 * disputed has no deadline to show, since the dispute froze it.
 */
export async function readListingState(listing: {
  id: string;
  status: TradeOfferStatus;
  endedAt: Date | null;
}) {
  const trade = await readListingTrade(listing);
  const state = listingStateSchema.parse({
    status: listing.status,
    endedAt: listing.endedAt,
    deadlineAt: trade?.status === "disputed" ? null : trade?.deadlineAt,
    counterparty: trade?.username ?? null,
  });
  return { state, trade };
}

/**
 * The candidate's side of an open listing, per want row: how many usable
 * copies of the collections it fits they own before the cap, how many it
 * is short, and the copies the allocation over all their usable copies
 * picks for it. The allocation runs here, since one copy can fit two rows,
 * but only its picks leave, so the answer stays as small as the listing
 * whatever the viewer holds. A payment row (not claimable until sales)
 * takes nothing and leaves `blocked` to say so.
 */
export async function readCandidateSide(
  address: string,
  wants: StoredWant[],
): Promise<CandidateRow[]> {
  const tradeWants = wants.map(toTradeWant);
  const claimable = tradeWants.flatMap((want) => (want ? [want] : []));
  const inventory = await readCandidates(
    address,
    claimable,
    totalWanted(claimable),
  );

  const copies = new Map(inventory.map((copy) => [copy.tokenId, copy]));
  const allocations = allocate(
    claimable,
    inventory.map((copy) => ({ tokenId: copy.tokenId, ...copy.attributes })),
  );
  // one entry per collection: its values and every usable copy, before the cap
  const owned = new Map(
    inventory.map((copy) => [
      copy.collectionId,
      { ...copy.attributes, owned: copy.owned },
    ]),
  );
  const picked = new Set(
    allocations.flatMap((allocation) =>
      allocation.tokenIds.flatMap(
        (tokenId) => copies.get(tokenId)?.collectionId ?? [],
      ),
    ),
  );
  const collections = new Map(
    (picked.size
      ? await indexer.query.collections.findMany({
          where: { id: { in: [...picked] } },
        })
      : []
    ).map((row) => [row.id, Objekt.fromIndexer(row)]),
  );

  const rows = allocations.values();
  return tradeWants.map((want): CandidateRow => {
    const allocation = want && rows.next().value;
    if (!want || !allocation) return { owned: 0, missing: 0, picks: [] };
    return {
      owned: [...owned.values()]
        .filter((collection) => fitsWant(want, collection))
        .reduce((total, collection) => total + collection.owned, 0),
      missing: allocation.missing,
      picks: allocation.tokenIds.flatMap((tokenId): ListingPick[] => {
        const copy = copies.get(tokenId);
        const collection = copy && collections.get(copy.collectionId);
        return copy && collection
          ? [
              {
                tokenId,
                serial: copy.serial,
                attributes: copy.attributes,
                collection,
              },
            ]
          : [];
      }),
    };
  });
}
