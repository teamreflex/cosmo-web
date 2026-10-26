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
import { allocateUnits, fitsWant } from "@apollo/trades/allocate";
import {
  claimCap,
  type ClaimStats,
  MAX_TOTAL_WANTED,
} from "@apollo/trades/caps";
import { needsYou, tradeState } from "@apollo/trades/lifecycle";
import {
  and,
  count,
  desc,
  EmptyFilter,
  eq,
  exists,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { toFeedbackRep } from "../../universal/feedback";
import { Objekt } from "../../universal/objekt-conversion";
import {
  type CandidateRow,
  type ListingCounterparty,
  type ListingOfferSummary,
  type ListingPick,
  listingStateSchema,
  type ListingTrade,
  type ListingTradeSize,
  offerRefusal,
  storedObjektItemSchema,
  type StoredWant,
  toTradeWant,
} from "../../universal/trade-listings";
import { toPublicUser } from "../auth.server";
import { db, type DbOrTx } from "../db";
import { indexer } from "../db/indexer";
import { feedbackRepColumns } from "../feedback.server";
import { feedItem, readIndexed } from "./feed.server";
import { readCandidates, readSharedTokenFlags } from "./holdings.server";
import { posterLinkColumns } from "./poster.server";
import { deadlinePassed, watermarkExtra } from "./trade-view.server";
import { claimerLink } from "./trade.server";

const qb = new QueryBuilder();

/**
 * The rows that are open claims: trades taken from a listing that are
 * still accepted or disputed. Only a claim's trade copies items with a
 * `listing_id`.
 */
const openClaim = and(
  eq(tradeOffers.kind, "trade"),
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
);

/**
 * What a user's claim cap is judged on, in one statement: their linked COSMO
 * `address` (null when unlinked), how many claims they hold open, and the
 * feedback score of their linked address, or 0 before its first scored
 * rating.
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
    .where(and(eq(tradeOffers.toUserId, userId), openClaim));
  return {
    address: row?.address ?? null,
    active: row?.active ?? 0,
    score: row?.score ?? 0,
  };
}

/**
 * Which of the users hold as many open claims as their cap allows, judged
 * as claimStanding() judges one, in one grouped statement. A user with no
 * open claim is under any cap, so they don't need a row.
 */
async function atClaimCap(userIds: readonly string[]) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await db
    .select({
      userId: tradeOffers.toUserId,
      active: count(),
      score: sql<number>`coalesce(${userFeedbackStats.score}, 0)`.mapWith(
        Number,
      ),
    })
    .from(tradeOffers)
    .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, tradeOffers.toUserId))
    .leftJoin(
      userFeedbackStats,
      eq(userFeedbackStats.address, cosmoAccounts.address),
    )
    .where(and(inArray(tradeOffers.toUserId, [...userIds]), openClaim))
    .groupBy(tradeOffers.toUserId, userFeedbackStats.score);
  return new Set(
    rows.flatMap((row) =>
      row.userId !== null && row.active >= claimCap(row) ? [row.userId] : [],
    ),
  );
}

// a trade from the listing, which keeps the listing's id on the poster's items
function fromListing(listingId: string) {
  return qb
    .select({ id: tradeOfferItems.id })
    .from(tradeOfferItems)
    .where(
      and(
        eq(tradeOfferItems.offerId, tradeOffers.id),
        eq(tradeOfferItems.listingId, listingId),
      ),
    );
}

/**
 * The listing's state. A filled one counts its completed trades and names
 * the COSMO account behind the latest one's claimer address.
 */
export async function readListingState(listing: {
  id: string;
  status: TradeOfferStatus;
  endedAt: Date | null;
}) {
  const [completed] =
    listing.status === "filled"
      ? await db
          .select({
            trades: sql<number>`(count(*) over ())::int`.mapWith(Number),
            username: cosmoAccounts.username,
          })
          .from(tradeOffers)
          .leftJoin(
            cosmoAccounts,
            eq(cosmoAccounts.address, tradeOffers.toAddress),
          )
          .where(
            and(
              eq(tradeOffers.kind, "trade"),
              eq(tradeOffers.status, "completed"),
              exists(fromListing(listing.id)),
            ),
          )
          .orderBy(desc(tradeOffers.endedAt), desc(tradeOffers.id))
          .limit(1)
      : [];
  return listingStateSchema.parse({
    status: listing.status,
    endedAt: listing.endedAt,
    counterparty: completed?.username ?? null,
    trades: completed?.trades ?? 0,
  });
}

/**
 * The trades from a listing that got under way, newest first: the pending
 * offers on it and every trade a claim or an accepted offer started, so an
 * offer that was declined, withdrawn, expired or went stale never shows.
 * Each comes with its items in id order and its claimer: their user and
 * COSMO link, the COSMO account behind the address it pinned and that
 * address's rating. A disputed one comes with the event that froze it, and
 * each with the drain's watermark, which says whether an accepted one's
 * deadline has passed. `claimerId` narrows them to one claimer's.
 */
export function readListingTrades(listingId: string, claimerId?: string) {
  return db.query.tradeOffers.findMany({
    where: {
      kind: "trade",
      toUserId: claimerId ?? EmptyFilter,
      OR: [{ status: "pending" }, { acceptedAt: { isNotNull: true } }],
      items: { listingId },
    },
    columns: {
      id: true,
      status: true,
      cancelledBy: true,
      proposedBy: true,
      toUserId: true,
      toAddress: true,
      acceptedAt: true,
      deadlineAt: true,
      expiresAt: true,
      endedAt: true,
    },
    extras: { watermark: watermarkExtra },
    with: {
      items: { orderBy: { id: "asc" } },
      messages: {
        columns: { event: true, createdAt: true },
        where: {
          kind: "event",
          RAW: (t) => sql`${t.event}->>'type' = 'disputed'`,
        },
        orderBy: { id: "desc" },
        limit: 1,
      },
      toUser: { with: { cosmoAccount: posterLinkColumns } },
      toCosmo: { columns: { username: true } },
      toStats: { columns: feedbackRepColumns },
    },
    orderBy: { createdAt: "desc", id: "desc" },
  });
}

type ListingTradeRow = Awaited<ReturnType<typeof readListingTrades>>[number];

// the poster's items and the claimer's on a trade from the listing, in id order
function tradeSides(row: ListingTradeRow) {
  const side = (sender: "from" | "to") =>
    row.items.flatMap((item) =>
      item.sender === sender ? [storedObjektItemSchema.parse(item)] : [],
    );
  return { from: side("from"), to: side("to") };
}

/**
 * How many objekts each side of a trade from the listing sends.
 */
export function tradeSize(row: ListingTradeRow): ListingTradeSize {
  const { from, to } = tradeSides(row);
  return { from: from.length, to: to.length };
}

/**
 * A pending offer's two sides as its claimer sees them on the listing: the
 * pool objekts it picked and the claimer's it gives, with their serials and
 * collections.
 */
export async function offerSides(row: ListingTradeRow) {
  const { from, to } = tradeSides(row);
  const items = [...from, ...to];
  const indexed = await readIndexed(
    [...new Set(items.map((item) => item.attributes.slug))],
    items.map((item) => item.tokenId),
  );
  return {
    picks: from.map((item) => feedItem(item, indexed)),
    given: to.map((item) => feedItem(item, indexed)),
  };
}

/**
 * How the claimer's latest trade from the listing ended when it was an
 * offer the poster or the listing ended (EndedOfferStatus), else null: one
 * they withdrew needs no word, and any later trade replaces it.
 */
export async function readEndedOffer(listingId: string, claimerId: string) {
  const latest = await db.query.tradeOffers.findFirst({
    where: { kind: "trade", toUserId: claimerId, items: { listingId } },
    columns: { status: true },
    orderBy: { createdAt: "desc", id: "desc" },
  });
  switch (latest?.status) {
    case "declined":
    case "expired":
    case "stale":
      return latest.status;
    default:
      return null;
  }
}

function counterparty(row: ListingTradeRow): ListingCounterparty {
  return {
    user: row.toUser && toPublicUser(row.toUser),
    cosmoUsername: row.toCosmo?.username ?? null,
    rep: row.toUser && toFeedbackRep(row.toStats),
  };
}

/**
 * The poster's side of their open listing: its pending offers, each judged
 * as accepting it would be right now (offerRefusal), and every trade it
 * started, a live one with where it stands for the poster. The indexer is
 * read once for the page, for every offer's tokens, and the claimers' caps
 * in one statement.
 */
export async function readPosterSide(listing: {
  id: string;
  fromAddress: string;
  unitSize: number;
  wants: StoredWant[];
  pool: readonly number[];
  posterRefused: boolean;
}): Promise<{ offers: ListingOfferSummary[]; trades: ListingTrade[] }> {
  const rows = await readListingTrades(listing.id);
  const pending = rows.flatMap((row) => {
    if (row.status !== "pending") return [];
    // trade_offers_trade_chk: every pending offer expires
    if (row.expiresAt === null) {
      throw new Error(`offer ${row.id} has no expiry`);
    }
    // an offer on a listing pins the claimer's address when it's sent
    if (row.toAddress === null) {
      throw new Error(`offer ${row.id} has no claimer address`);
    }
    return [
      {
        row,
        expiresAt: row.expiresAt,
        toAddress: row.toAddress,
        sides: tradeSides(row),
      },
    ];
  });
  const offered = pending.flatMap(({ sides }) => [...sides.from, ...sides.to]);
  const tokenIds = [...new Set(offered.map((item) => item.tokenId))];
  const indexed = await readIndexed(
    [...new Set(offered.map((item) => item.attributes.slug))],
    tokenIds,
  );
  const flagsFor = await readSharedTokenFlags(db, tokenIds, [
    listing.fromAddress,
    ...pending.map(({ toAddress }) => toAddress),
  ]);
  const atCap = await atClaimCap([
    ...new Set(pending.flatMap(({ row }) => row.toUserId ?? [])),
  ]);
  const pool = new Set(listing.pool);
  const wants = listing.wants.flatMap((want) => toTradeWant(want) ?? []);
  const now = new Date();

  return {
    offers: pending.map(
      ({ row, expiresAt, toAddress, sides }): ListingOfferSummary => {
        const picks = sides.from.map((item) => item.tokenId);
        const given = sides.to.map((item) => item.tokenId);
        return {
          tradeId: row.id,
          claimer: counterparty(row),
          size: { from: picks.length, to: given.length },
          picks: sides.from.map((item) => feedItem(item, indexed)),
          given: sides.to.map((item) => feedItem(item, indexed)),
          expiresAt,
          refusal: offerRefusal(
            { expiresAt, picks, given },
            { ...listing, pool, wants },
            {
              address: toAddress,
              linked:
                row.toUser !== null &&
                claimerLink(
                  row.toUser,
                  row.toUser.cosmoAccount?.address,
                  toAddress,
                ).kind === "linked",
              atCap: row.toUserId !== null && atCap.has(row.toUserId),
            },
            {
              states: indexed.states,
              poster: flagsFor(listing.fromAddress),
              claimer: flagsFor(toAddress),
            },
            now,
          ),
        };
      },
    ),
    trades: rows.flatMap((row): ListingTrade[] => {
      if (row.status === "pending") return [];
      // readListingTrades reads only pending offers and accepted trades
      if (row.acceptedAt === null) {
        throw new Error(`trade ${row.id} was never accepted`);
      }
      const trade = {
        tradeId: row.id,
        claimer: counterparty(row),
        size: tradeSize(row),
        acceptedAt: row.acceptedAt,
        tokenIds: tradeSides(row).from.map((item) => item.tokenId),
      };
      switch (row.status) {
        case "accepted": {
          // trade_offers_accepted_chk: an accepted trade has a deadline
          if (row.deadlineAt === null) {
            throw new Error(`trade ${row.id} has no deadline`);
          }
          const state = tradeState(row, row.items);
          return [
            {
              ...trade,
              status: row.status,
              deadlineAt: row.deadlineAt,
              toSend: row.items.filter(
                (item) =>
                  item.sender === "from" &&
                  item.kind === "objekt" &&
                  item.transferredAt === null,
              ).length,
              needsYou: needsYou(state, "from", {
                deadlinePassed: deadlinePassed(
                  state,
                  row.deadlineAt,
                  row.watermark,
                ),
              }),
            },
          ];
        }
        case "disputed": {
          // trade_offers_accepted_chk: a disputed trade has a deadline
          if (row.deadlineAt === null) {
            throw new Error(`trade ${row.id} has no deadline`);
          }
          // a pause by a ban or a passed deadline reads as neutral, as on My trades
          const [dispute] = row.messages;
          return [
            {
              ...trade,
              status: row.status,
              paused:
                dispute?.event?.type === "disputed" &&
                (dispute.event.by === "staff" ||
                  dispute.event.by === "deadline"),
              deadlineAt: row.deadlineAt,
              // the timer stopped when the dispute opened, as My trades holds it
              pausedAt: dispute?.createdAt ?? row.deadlineAt,
            },
          ];
        }
        case "completed":
        case "cancelled":
        case "timed_out":
          if (row.endedAt === null) {
            throw new Error(`trade ${row.id} ended without an end`);
          }
          return [{ ...trade, status: row.status, endedAt: row.endedAt }];
        default:
          throw new Error(`trade ${row.id} from a listing is ${row.status}`);
      }
    }),
  };
}

/**
 * The candidate's side of an open listing: the most units they can take,
 * bounded by the free pool, the claim caps and what they hold
 * (allocateUnits), and per want row how many usable copies of the
 * collections it fits they own before the cap, how many it is short, and
 * the copies the allocation at that size picks for it, one unit's when
 * they can't fill one. The allocation runs here, since one copy can fit
 * two rows, but only its picks leave, so the answer stays as small as the
 * listing whatever the viewer holds. A payment row (not claimable until
 * sales) takes nothing and leaves `blocked` to say so.
 */
export async function readCandidateSide(
  address: string,
  wants: StoredWant[],
  pool: { free: number; unitSize: number },
): Promise<{ units: number; rows: CandidateRow[] }> {
  const tradeWants = wants.map(toTradeWant);
  const claimable = tradeWants.flatMap((want) => (want ? [want] : []));
  // no claim takes more than MAX_TOTAL_WANTED copies, of one collection or all
  const inventory = await readCandidates(address, claimable, MAX_TOTAL_WANTED);

  const copies = new Map(inventory.map((copy) => [copy.tokenId, copy]));
  const { units, allocation } = allocateUnits(
    claimable,
    inventory.map((copy) => ({ tokenId: copy.tokenId, ...copy.attributes })),
    pool,
  );
  // one entry per collection: its values and every usable copy, before the cap
  const owned = new Map(
    inventory.map((copy) => [
      copy.collectionId,
      { ...copy.attributes, owned: copy.owned },
    ]),
  );
  const picked = new Set(
    allocation.flatMap((row) =>
      row.tokenIds.flatMap(
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

  const allocated = allocation.values();
  return {
    units,
    rows: tradeWants.map((want): CandidateRow => {
      const row = want && allocated.next().value;
      if (!want || !row) return { owned: 0, missing: 0, picks: [] };
      return {
        owned: [...owned.values()]
          .filter((collection) => fitsWant(want, collection))
          .reduce((total, collection) => total + collection.owned, 0),
        missing: row.missing,
        picks: row.tokenIds.flatMap((tokenId): ListingPick[] => {
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
    }),
  };
}
