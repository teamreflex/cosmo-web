import {
  cosmoAccounts,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import {
  liveTradeStatuses,
  type TradeOfferStatus,
} from "@apollo/database/web/types";
import { allocate, fitsWant } from "@apollo/trades/allocate";
import { totalWanted } from "@apollo/trades/composer";
import { and, desc, eq, exists, inArray, isNotNull } from "drizzle-orm";
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
 * How many claims the user holds open: trades they accepted from a
 * listing that are still accepted or disputed. Only a claim's trade copies
 * items with a `listing_id`.
 */
export function activeClaimCount(executor: DbOrTx, userId: string) {
  return executor.$count(
    tradeOffers,
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
}

/**
 * The trade a listing led to, with the COSMO username behind the claimer's
 * pinned address: a claimed listing's live trade, or an ended listing's
 * latest trade. A claim's trade keeps the listing's id on the poster's
 * items, and a listing has at most one live trade.
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
