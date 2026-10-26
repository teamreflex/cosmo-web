import { isBanActive } from "@apollo/auth/guard";
import {
  cosmoAccounts,
  listDrainCursor,
  notifications,
  reports,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt, listingPoolState } from "@apollo/database/web/sql";
import type {
  DisputeReason,
  NewTradeNotification,
  TradeEvent as StoredTradeEvent,
  TradeSide,
} from "@apollo/database/web/types";
import {
  endedTradeColumns,
  listingClosing,
  listingTransition,
  type PartyActionRefusal,
  type TradeEvent,
  tradeListings,
  type TradeState,
  tradeState,
  transition,
} from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME, isTimedOut } from "@apollo/trades/timers";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type {
  ClaimTokenRefusal,
  TradeErrorCode,
} from "../../universal/errors/trades";
import { db, type DbOrTx, type WebTx } from "../db";
import { isPostgresError } from "../util.server";

export function refuseTrade(code: TradeErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * Refuses a token the caller can't give, naming it and why, so the page can
 * say which serial to swap.
 */
export function refuseToken({ tokenId, reason }: ClaimTokenRefusal): never {
  throw new ExpectedError("claim_token_unavailable", { tokenId, reason });
}

// refuses a user whose account is gone or banned
export function refusePoster<
  T extends { banned: boolean; banExpires: Date | null },
>(row: T | undefined): asserts row is T {
  if (!row) {
    throw new ExpectedError("not_signed_in" satisfies AuthErrorCode);
  }
  if (isBanActive(row)) {
    throw new ExpectedError("forbidden" satisfies AuthErrorCode);
  }
}

/**
 * A user row a trade write has locked, with what the ban check reads.
 */
export type LockedUser = {
  id: string;
  banned: boolean;
  banExpires: Date | null;
};

/**
 * Locks the rows of the users a trade write involves, `FOR SHARE` unless
 * the caller writes them, in one statement ordered by id, before any trade
 * row, so the write can't interleave with a deletion or a ban. A user whose
 * account is gone has no row.
 */
export function lockParties(
  tx: WebTx,
  userIds: readonly (string | null)[],
  strength: "share" | "no key update" = "share",
): Promise<LockedUser[]> {
  return tx
    .select({ id: user.id, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(
      inArray(
        user.id,
        userIds.flatMap((id) => id ?? []),
      ),
    )
    .orderBy(asc(user.id))
    .for(strength);
}

/**
 * The COSMO link of each user whose row the caller locked `FOR NO KEY
 * UPDATE`, by user id, which keeps a link change, taking `FOR SHARE` on the
 * user, from committing before the write does. Read in a statement of its
 * own once the locks are held: a lock that waited on a relink re-reads only
 * the user row, so a link joined into the locking statement would still be
 * the one from before the wait. An unlinked user has no entry.
 */
export async function readLockedLinks(
  tx: WebTx,
  userIds: readonly (string | null)[],
) {
  const links = await tx
    .select({
      userId: cosmoAccounts.userId,
      address: cosmoAccounts.address,
      username: cosmoAccounts.username,
    })
    .from(cosmoAccounts)
    .where(
      inArray(
        cosmoAccounts.userId,
        userIds.flatMap((id) => id ?? []),
      ),
    );
  return new Map(
    links.flatMap(({ userId, ...link }) =>
      userId === null ? [] : [[userId, link]],
    ),
  );
}

/**
 * Locks a trade's row `FOR NO KEY UPDATE` and reads its items in id order,
 * with the state transitions take and the database's clock, which feedback's
 * window and a pending offer's expiry are judged by. Listings and missing
 * ids are not found.
 */
export async function lockTrade(tx: WebTx, tradeId: string) {
  const [row] = await tx
    .select({
      id: tradeOffers.id,
      status: tradeOffers.status,
      fromUserId: tradeOffers.fromUserId,
      toUserId: tradeOffers.toUserId,
      fromAddress: tradeOffers.fromAddress,
      toAddress: tradeOffers.toAddress,
      deadlineAt: tradeOffers.deadlineAt,
      expiresAt: tradeOffers.expiresAt,
      endedAt: tradeOffers.endedAt,
      cancelledBy: tradeOffers.cancelledBy,
      proposedBy: tradeOffers.proposedBy,
      disputeReportId: tradeOffers.disputeReportId,
      now: sql<Date>`now()`.mapWith(tradeOffers.endedAt),
    })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.id, tradeId), eq(tradeOffers.kind, "trade")))
    .for("no key update");
  if (!row) refuseTrade("trade_not_found");

  const items = await tx
    .select({
      id: tradeOfferItems.id,
      kind: tradeOfferItems.kind,
      sender: tradeOfferItems.sender,
      tokenId: tradeOfferItems.tokenId,
      listingId: tradeOfferItems.listingId,
      transferredAt: tradeOfferItems.transferredAt,
      markedPaidAt: tradeOfferItems.markedPaidAt,
      confirmedAt: tradeOfferItems.confirmedAt,
    })
    .from(tradeOfferItems)
    .where(eq(tradeOfferItems.offerId, tradeId))
    .orderBy(asc(tradeOfferItems.id));
  return { ...row, items, state: tradeState(row, items) };
}

export type LockedTrade = Awaited<ReturnType<typeof lockTrade>>;

/**
 * The trade's parties, token ids and the listing its poster's items came
 * from (null for a direct offer), read without a lock, when the caller is
 * one of them. A trade's items never change. Anything else, a listing
 * included, is not found.
 */
export async function partyTrade(userId: string, tradeId: string) {
  const trade = await db.query.tradeOffers.findFirst({
    where: {
      id: tradeId,
      kind: "trade",
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    columns: { fromUserId: true, toUserId: true },
    with: { items: { columns: { tokenId: true, listingId: true } } },
  });
  if (!trade) refuseTrade("trade_not_found");
  return {
    fromUserId: trade.fromUserId,
    toUserId: trade.toUserId,
    tokenIds: trade.items.flatMap((item) => item.tokenId ?? []),
    listingId: tradeListingId(trade.items),
  };
}

// the listing a trade came from, a claim or an offer on it, which every item from its pool names
export function tradeListingId(items: readonly { listingId: string | null }[]) {
  return items.find((item) => item.listingId !== null)?.listingId ?? null;
}

/**
 * Locks a party action's users, `FOR SHARE` unless the action starts a live
 * trade or creates one, then its trade, refusing a caller whose account is
 * gone or banned. The caller's side comes from the session.
 */
export async function lockPartyTrade(
  tx: WebTx,
  userId: string,
  tradeId: string,
  parties: { fromUserId: string | null; toUserId: string | null },
  strength: "share" | "no key update" = "share",
) {
  const users = await lockParties(
    tx,
    [parties.fromUserId, parties.toUserId],
    strength,
  );
  refusePoster(users.find((row) => row.id === userId));
  const trade = await lockTrade(tx, tradeId);
  const by: TradeSide = trade.fromUserId === userId ? "from" : "to";
  return { users, trade, by };
}

/**
 * Whether the trade's deadline has passed the drain's watermark, after which
 * a party can't cancel or dispute it, since the timers end it instead.
 */
export async function isDue(tx: WebTx, trade: LockedTrade) {
  return (
    trade.deadlineAt !== null &&
    isTimedOut(trade.deadlineAt, await readWatermark(tx))
  );
}

/**
 * What a refused party action answers. The refusals a cancel or dispute
 * can't reach read as the trade having changed, and a counter to an offer
 * on a listing as the offer being unavailable to counter.
 */
export const partyRefusals = {
  wrong_status: "trade_status_changed",
  deadline_passed: "trade_deadline_passed",
  already_started: "trade_cancel_started",
  wrong_party: "trade_status_changed",
  already_done: "trade_status_changed",
  no_such_item: "trade_status_changed",
  listing_offer: "offer_unavailable",
} as const satisfies Record<PartyActionRefusal, TradeErrorCode>;

/**
 * A party's answer to a locked pending offer, refused the way a cancel is
 * when the offer has moved on, then once its 72 hours have passed on the
 * database's clock, which is the boundary trade-timers expires it at.
 * Returns the state the offer moves to.
 */
export function answerOffer(
  trade: LockedTrade,
  event: Extract<
    TradeEvent,
    { type: "accept" | "decline" | "counter" | "withdraw" }
  >,
) {
  const result = transition(trade.state, event);
  if (!result.ok) refuseTrade(partyRefusals[result.reason]);
  if (
    trade.expiresAt !== null &&
    trade.expiresAt.getTime() <= trade.now.getTime()
  ) {
    refuseTrade("offer_expired");
  }
  return result.trade;
}

/**
 * Runs a write that makes trade items live, turning a clash on the
 * live-token index (a token another trade made live after the checks read
 * it) into `refusal`.
 */
export async function refuseLiveClash(
  write: PromiseLike<unknown>,
  refusal: TradeErrorCode,
) {
  try {
    await write;
  } catch (error) {
    if (isPostgresError(error, "23505", "trade_offer_items_live_token_idx")) {
      refuseTrade(refusal);
    }
    throw error;
  }
}

/**
 * The drain's chain-time watermark, which deadlines are judged against, or
 * null before the drain has stamped one.
 */
async function readWatermark(executor: DbOrTx) {
  const [cursor] = await executor
    .select({ chainTime: listDrainCursor.chainTime })
    .from(listDrainCursor)
    .where(eq(listDrainCursor.name, DRAIN_CURSOR_NAME));
  return cursor?.chainTime ?? null;
}

/**
 * Updates a locked trade's row, guarded on the status it was locked in. The
 * lock means nothing else can have changed it, so a miss is a bug.
 */
export async function updateLockedTrade(
  tx: WebTx,
  trade: LockedTrade,
  set: PgUpdateSetSource<typeof tradeOffers>,
) {
  const [updated] = await tx
    .update(tradeOffers)
    .set(set)
    .where(
      and(
        eq(tradeOffers.id, trade.id),
        eq(tradeOffers.status, trade.state.status),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!updated) throw new Error("Trade changed under its lock");
}

/**
 * Ends a locked trade in the state a transition returned: its row and its
 * items' reservations, then the listings its poster's objekts came from,
 * locked in id order. A completed trade's objekts leave each listing's
 * pool, since they were given, and stay on it as history (`left_at`); a
 * cancelled one's are free in the pool again. Each listing then closes if its pool can no longer make a unit
 * (closeSpentListings).
 */
export async function endTrade(
  tx: WebTx,
  trade: LockedTrade,
  next: TradeState,
) {
  await updateLockedTrade(tx, trade, {
    ...endedTradeColumns(next),
    endedAt: sql`now()`,
  });
  await tx
    .update(tradeOfferItems)
    .set({ live: false })
    .where(
      and(
        eq(tradeOfferItems.offerId, trade.id),
        eq(tradeOfferItems.live, true),
      ),
    );

  const listings = tradeListings(trade.items);
  if (listings.size === 0) return;
  await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(inArray(tradeOffers.id, [...listings.keys()]))
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  if (next.status === "completed") {
    await tx
      .update(tradeOfferItems)
      .set({ leftAt: sql`now()` })
      .where(
        and(
          or(
            ...[...listings].map(([listingId, tokenIds]) =>
              and(
                eq(tradeOfferItems.offerId, listingId),
                inArray(tradeOfferItems.tokenId, tokenIds),
              ),
            ),
          ),
          isNull(tradeOfferItems.leftAt),
        ),
      );
  }
  await closeSpentListings(tx, [...listings.keys()]);
}

/**
 * Closes the open listings among `listingIds` whose pool can no longer make
 * a unit and that have no live trade left (listingClosing): filled when one
 * of their trades completed, else broken. The caller holds their locks.
 */
async function closeSpentListings(tx: WebTx, listingIds: readonly string[]) {
  const listings = await tx
    .select({
      id: tradeOffers.id,
      unitSize: tradeOffers.unitSize,
      ...listingPoolState,
    })
    .from(tradeOffers)
    .where(
      and(
        inArray(tradeOffers.id, [...listingIds]),
        eq(tradeOffers.kind, "listing"),
        eq(tradeOffers.status, "open"),
      ),
    );
  const closing = Map.groupBy(
    listings.flatMap(({ id, unitSize, ...state }) => {
      // trade_offers_unit_size_chk: every listing has a unit size
      if (unitSize === null) throw new Error(`listing ${id} has no unit`);
      const event = listingClosing({ unitSize, ...state });
      return event === null ? [] : [{ id, event }];
    }),
    ({ event }) => event,
  );
  for (const [event, closed] of closing) {
    const { from, to } = listingTransition(event);
    await tx
      .update(tradeOffers)
      .set({ status: to, endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
      .where(
        and(
          inArray(
            tradeOffers.id,
            closed.map(({ id }) => id),
          ),
          inArray(tradeOffers.status, [...from]),
        ),
      );
  }
}

/**
 * A dispute a party opens, or one a ban files as staff.
 */
type Dispute = { reporterId: string; note: string | null } & (
  | { by: TradeSide; reason: DisputeReason }
  | { by: "staff"; reason: "party_banned" }
);

/**
 * Files a trade report on a locked accepted trade and freezes the trade
 * under it: it becomes disputed, and its deadline stops counting until
 * staff act. Posts the timeline event and notifies `recipients`, the
 * parties who didn't open it. Returns the report's id.
 */
export async function disputeTrade(
  tx: WebTx,
  trade: LockedTrade,
  recipients: readonly LockedUser[],
  dispute: Dispute,
) {
  const [report] = await tx
    .insert(reports)
    .values({
      reporterId: dispute.reporterId,
      reason: dispute.reason,
      note: dispute.note,
      targetType: "trade",
      targetId: trade.id,
    })
    .returning({ id: reports.id });
  if (!report) throw new Error("Report insert returned no row");

  await updateLockedTrade(tx, trade, {
    status: "disputed",
    disputeReportId: report.id,
  });
  await insertTradeEvent(
    tx,
    trade.id,
    dispute.by === "staff"
      ? { type: "disputed", by: dispute.by, reportId: report.id }
      : {
          type: "disputed",
          by: dispute.by,
          reportId: report.id,
          reason: dispute.reason,
        },
  );
  await notifyUsers(tx, recipients, {
    type: "trade_disputed",
    offerId: trade.id,
    actorId: dispute.by === "staff" ? null : dispute.reporterId,
    tokenId: null,
  });
  return report.id;
}

/**
 * Appends a timeline event to the trade's message stream.
 */
export async function insertTradeEvent(
  tx: WebTx,
  tradeId: string,
  event: StoredTradeEvent,
) {
  await tx.insert(tradeMessages).values({ tradeId, kind: "event", event });
}

/**
 * Notifies each recipient about a trade or listing, skipping anyone with an
 * active ban. The recipients are rows the caller has locked, so the ban
 * can't change before commit.
 */
export async function notifyUsers(
  tx: WebTx,
  recipients: readonly LockedUser[],
  notification: NewTradeNotification,
) {
  const values = recipients.flatMap((recipient) =>
    isBanActive(recipient) ? [] : [{ ...notification, userId: recipient.id }],
  );
  if (values.length > 0) await tx.insert(notifications).values(values);
}
