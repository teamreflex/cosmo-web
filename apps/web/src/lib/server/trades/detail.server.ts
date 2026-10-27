import {
  cosmoAccounts,
  tradeOfferItems,
  tradeOffers,
  userFeedbackStats,
} from "@apollo/database/web/schema";
import {
  liveTradeStatuses,
  openTradeStatuses,
  type TradeOfferItem,
  type TradeOfferStatus,
} from "@apollo/database/web/types";
import { allocateUnits, fitsWant } from "@apollo/trades/allocate";
import {
  claimCap,
  type ClaimStats,
  MAX_TOTAL_WANTED,
} from "@apollo/trades/caps";
import { needsYou, tradeState } from "@apollo/trades/lifecycle";
import { isEqual } from "@apollo/util";
import {
  and,
  type AnyColumn,
  count,
  desc,
  EmptyFilter,
  eq,
  exists,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import {
  type CandidateRow,
  type EndedOfferStatus,
  type ListingOfferSummary,
  listingStateSchema,
  type ListingTrade,
  type ListingViewer,
  offerRefusal,
  storedObjektItemSchema,
  type StoredWant,
  type TradeRatio,
  tradeWants,
} from "../../universal/trade-listings";
import { db, type DbOrTx } from "../db";
import { feedbackRepColumns } from "../feedback.server";
import { feedItem, readIndexed } from "./feed.server";
import { readCandidates, readSharedTokenFlags } from "./holdings.server";
import { posterLinkColumns } from "./poster.server";
import {
  deadlinePassed,
  toTradeParty,
  tradeDispute,
  watermarkExtra,
} from "./trade-view.server";
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

const listingClaim = alias(tradeOffers, "listing_claim");

/**
 * What a user's claim cap is judged on, in one statement: their linked COSMO
 * `address` (null when unlinked), how many claims they hold open, and the
 * feedback score of their linked address, or 0 before its first scored
 * rating. A claim passes its listing, which adds whether the user already
 * has a trade from it under way (`claimsListing`): a live claim, or an offer
 * on it still waiting for the poster, whose poster's items keep the
 * listing's id.
 */
export async function claimStanding(
  executor: DbOrTx,
  userId: string,
  listingId?: string,
): Promise<
  ClaimStats & {
    address: string | null;
    active: number;
    claimsListing: boolean;
  }
> {
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
      claimsListing:
        listingId === undefined
          ? sql<boolean>`false`
          : exists(
              qb
                .select({ id: listingClaim.id })
                .from(tradeOfferItems)
                .innerJoin(
                  listingClaim,
                  eq(listingClaim.id, tradeOfferItems.offerId),
                )
                .where(
                  and(
                    eq(tradeOfferItems.listingId, listingId),
                    eq(listingClaim.toUserId, userId),
                    inArray(listingClaim.status, [...openTradeStatuses]),
                  ),
                ),
            ).mapWith(Boolean),
    })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.toUserId, userId), openClaim));
  return {
    address: row?.address ?? null,
    active: row?.active ?? 0,
    score: row?.score ?? 0,
    claimsListing: row?.claimsListing ?? false,
  };
}

/**
 * Which of the users hold as many open claims as their cap allows, judged
 * as claimStanding() judges one, in one grouped statement. A user with no
 * open claim is under any cap, so they don't need a row.
 */
async function claimersAtCap(userIds: readonly string[]) {
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

const listingTrade = alias(tradeOffers, "listing_trade");

// the listing's completed trades, each keeping the listing's id on the poster's items
function completedFromListing(listingId: AnyColumn) {
  return and(
    eq(listingTrade.kind, "trade"),
    eq(listingTrade.status, "completed"),
    exists(
      qb
        .select({ id: tradeOfferItems.id })
        .from(tradeOfferItems)
        .where(
          and(
            eq(tradeOfferItems.offerId, listingTrade.id),
            eq(tradeOfferItems.listingId, listingId),
          ),
        ),
    ),
  );
}

/**
 * Relational extras that read what a filled listing's state names: how many
 * of its trades completed and the COSMO account behind the latest one's
 * claimer address. Only a filled listing runs them; any other reads 0 and
 * null.
 */
export const listingStateExtras = {
  completedTrades: (t: { id: AnyColumn; status: AnyColumn }) =>
    sql<number>`coalesce(case when ${t.status} = 'filled' then (${qb
      .select({ trades: count() })
      .from(listingTrade)
      .where(completedFromListing(t.id))}) end, 0)::int`.mapWith(Number),
  completedBy: (t: { id: AnyColumn; status: AnyColumn }) =>
    sql<string | null>`case when ${t.status} = 'filled' then (${qb
      .select({ username: cosmoAccounts.username })
      .from(listingTrade)
      .leftJoin(
        cosmoAccounts,
        eq(cosmoAccounts.address, listingTrade.toAddress),
      )
      .where(completedFromListing(t.id))
      .orderBy(desc(listingTrade.endedAt), desc(listingTrade.id))
      .limit(1)}) end`,
};

/**
 * The listing's state, from its row read with listingStateExtras.
 */
export function toListingState(listing: {
  status: TradeOfferStatus;
  endedAt: Date | null;
  completedTrades: number;
  completedBy: string | null;
}) {
  return listingStateSchema.parse({
    status: listing.status,
    endedAt: listing.endedAt,
    counterparty: listing.completedBy,
    trades: listing.completedTrades,
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
 * deadline has passed.
 */
function readListingTrades(listingId: string) {
  return db.query.tradeOffers.findMany({
    where: {
      kind: "trade",
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

/**
 * The latest trade from the listing that got under way, so a closed listing
 * can link to it: the viewer's own, or anyone's for its poster
 * (`claimerId` undefined).
 */
async function readLatestAcceptedTrade(
  listingId: string,
  claimerId: string | undefined,
) {
  const trade = await db.query.tradeOffers.findFirst({
    where: {
      kind: "trade",
      toUserId: claimerId ?? EmptyFilter,
      acceptedAt: { isNotNull: true },
      items: { listingId },
    },
    columns: { id: true },
    orderBy: { createdAt: "desc", id: "desc" },
  });
  return trade?.id ?? null;
}

/**
 * The claimer's latest trade from the listing, with its items in id order.
 * A claimer holds at most one live trade or pending offer per listing and
 * can't start another beside it, so an open one is always their latest.
 */
function readClaimerTrade(listingId: string, claimerId: string) {
  return db.query.tradeOffers.findFirst({
    where: { kind: "trade", toUserId: claimerId, items: { listingId } },
    columns: { id: true, status: true, deadlineAt: true, expiresAt: true },
    with: { items: { orderBy: { id: "asc" } } },
    orderBy: { createdAt: "desc", id: "desc" },
  });
}

/**
 * How a claimer's latest trade from the listing ended when it was an offer
 * the poster or the listing ended (EndedOfferStatus), else null: one they
 * withdrew needs no word, and any later trade replaces it.
 */
function endedOffer(status: TradeOfferStatus): EndedOfferStatus | null {
  switch (status) {
    case "declined":
    case "expired":
    case "stale":
      return status;
    default:
      return null;
  }
}

// the poster's items and the claimer's on a trade from the listing, in id order
function tradeSides(row: { items: readonly TradeOfferItem[] }) {
  const side = (sender: "from" | "to") =>
    row.items.flatMap((item) =>
      item.sender === sender ? [storedObjektItemSchema.parse(item)] : [],
    );
  return { from: side("from"), to: side("to") };
}

/**
 * How many objekts each side of a trade from the listing sends.
 */
function tradeSize(row: { items: readonly TradeOfferItem[] }): TradeRatio {
  const { from, to } = tradeSides(row);
  return { give: from.length, get: to.length };
}

/**
 * A pending offer's two sides as its claimer sees them on the listing: the
 * pool objekts it picked and the claimer's it gives, with their serials and
 * collections.
 */
async function offerSides(row: { items: readonly TradeOfferItem[] }) {
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

function claimer(row: ListingTradeRow) {
  return toTradeParty(row.toUserId, row.toUser, row.toCosmo, row.toStats);
}

/**
 * The poster's side of their open listing: its pending offers, each judged
 * as accepting it would be right now (offerRefusal), and every trade it
 * started, a live one with where it stands for the poster. The indexer is
 * read once for the page, for every offer's tokens, and the claimers' caps
 * in one statement.
 */
async function readPosterSide(listing: {
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
  const atCap = await claimersAtCap([
    ...new Set(pending.flatMap(({ row }) => row.toUserId ?? [])),
  ]);
  const pool = new Set(listing.pool);
  const wants = tradeWants(listing.wants);
  const now = new Date();

  return {
    offers: pending.map(
      ({ row, expiresAt, toAddress, sides }): ListingOfferSummary => {
        const picks = sides.from.map((item) => item.tokenId);
        const given = sides.to.map((item) => item.tokenId);
        return {
          tradeId: row.id,
          claimer: claimer(row),
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
      const { from, to } = tradeSides(row);
      const trade = {
        tradeId: row.id,
        claimer: claimer(row),
        acceptedAt: row.acceptedAt,
        tokenIds: from.map((item) => item.tokenId),
        givenCount: to.length,
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
          return [
            {
              ...trade,
              status: row.status,
              deadlineAt: row.deadlineAt,
              dispute: tradeDispute(tradeState(row, row.items), row.messages),
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
 * collections it fits they own before the cap and how many it is short at
 * that size, one unit's when they can't fill one. The allocation runs here,
 * since one copy can fit two rows, but only its counts leave, so the answer
 * stays as small as the listing whatever the viewer holds. The rows are the
 * ones objekts fill (tradeWants()); a listing with a payment row never
 * reaches the picker.
 */
async function readCandidateSide(
  address: string,
  wants: StoredWant[],
  pool: { free: number; unitSize: number },
): Promise<{ units: number; rows: CandidateRow[] }> {
  const claimable = tradeWants(wants);
  // no claim takes more than MAX_TOTAL_WANTED copies, of one collection or all
  const inventory = await readCandidates(address, claimable, MAX_TOTAL_WANTED);
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

  return {
    units,
    rows: claimable.map((want, index): CandidateRow => ({
      owned: [...owned.values()]
        .filter((collection) => fitsWant(want, collection))
        .reduce((total, collection) => total + collection.owned, 0),
      // allocate() answers every want, in order
      missing: allocation[index]?.missing ?? want.count,
    })),
  };
}

/**
 * The signed-in viewer's side of a listing, shown in place of Accept.
 * Always the session's own view; signed out, it's anonymous. Only the
 * listing's parties learn its trades' ids. The poster of an open listing
 * gets its offers and trades; a viewer with a live trade or a pending offer
 * from it gets that; anyone else is a candidate, judged against the `free`
 * objekts of the pool. Only an open listing's candidates are read: closed
 * listings and the poster's own never touch the viewer's holdings.
 */
export async function readListingViewer(
  listing: {
    id: string;
    status: TradeOfferStatus;
    fromUserId: string | null;
    fromAddress: string;
    unitSize: number;
    wants: StoredWant[];
    /** the pool's objekts that haven't left it */
    pool: readonly number[];
    /** how many of them are free to claim */
    free: number;
    /** whether the poster's account or terms refuse any claim (posterBlocked()) */
    posterRefused: boolean;
  },
  viewerId: string | undefined,
): Promise<ListingViewer> {
  if (viewerId === undefined) return { role: "anonymous" };
  const own = listing.fromUserId === viewerId;

  if (listing.status !== "open") {
    return {
      role: "closed",
      tradeId: await readLatestAcceptedTrade(
        listing.id,
        own ? undefined : viewerId,
      ),
    };
  }
  if (own) {
    return {
      role: "poster",
      ...(await readPosterSide(listing)),
    };
  }

  /**
   * A claimer's latest trade from the listing is their live one or pending
   * offer, if any. Their standing is only needed when there is neither, but
   * reading it alongside saves a round trip for every candidate.
   */
  const [trade, { address, ...standing }] = await Promise.all([
    readClaimerTrade(listing.id, viewerId),
    claimStanding(db, viewerId),
  ]);
  if (trade?.status === "pending" && trade.expiresAt !== null) {
    return {
      role: "offerer",
      tradeId: trade.id,
      expiresAt: trade.expiresAt,
      ...(await offerSides(trade)),
    };
  }
  if (
    trade !== undefined &&
    openTradeStatuses.some((status) => status === trade.status)
  ) {
    return {
      role: "claimer",
      tradeId: trade.id,
      deadlineAt: trade.status === "disputed" ? null : trade.deadlineAt,
      size: tradeSize(trade),
    };
  }

  if (address === null) return { role: "unlinked" };
  // the listing's `stop` says whether the pool or the poster's account stops a claim
  return {
    role: "candidate",
    ...(await readCandidateSide(address, listing.wants, {
      free: listing.free,
      unitSize: listing.unitSize,
    })),
    claims: { active: standing.active, cap: claimCap(standing) },
    ownAddress: isEqual(address, listing.fromAddress),
    endedOffer: trade === undefined ? null : endedOffer(trade.status),
  };
}
