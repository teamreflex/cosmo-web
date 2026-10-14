import { isBanActive } from "@apollo/auth/guard";
import {
  listDrainCursor,
  notifications,
  reports,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import type {
  DisputeReason,
  NewTradeNotification,
  TradeEvent as StoredTradeEvent,
  TradeSide,
} from "@apollo/database/web/types";
import { canOfferAll } from "@apollo/trades/holdings";
import {
  endedTradeColumns,
  listingEventAfter,
  type PartyActionRefusal,
  listingTransition,
  tradeListings,
  type TradeState,
  tradeState,
} from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME, isTimedOut } from "@apollo/trades/timers";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import { db, type DbOrTx, type WebTx } from "../db";
import { readWebTokenFlags, type TokenState } from "./holdings.server";
import { refusePoster } from "./listings.server";

export function refuseTrade(code: TradeErrorCode): never {
  throw new ExpectedError(code);
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
 * Locks a trade's row `FOR NO KEY UPDATE` and reads its items in id order,
 * with the state transitions take. Listings and missing ids are not found.
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
      cancelledBy: tradeOffers.cancelledBy,
      abandonedBy: tradeOffers.abandonedBy,
      disputeReportId: tradeOffers.disputeReportId,
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
 * The trade's parties and token ids, read without a lock, when the caller
 * is one of them. Anything else, a listing included, is not found.
 */
export async function partyTrade(userId: string, tradeId: string) {
  const trade = await db.query.tradeOffers.findFirst({
    where: {
      id: tradeId,
      kind: "trade",
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    columns: { fromUserId: true, toUserId: true },
    with: { items: { columns: { tokenId: true } } },
  });
  if (!trade) refuseTrade("trade_not_found");
  return {
    fromUserId: trade.fromUserId,
    toUserId: trade.toUserId,
    tokenIds: trade.items.flatMap((item) => item.tokenId ?? []),
  };
}

/**
 * Locks a party action's users, then its trade, refusing a caller whose
 * account is gone or banned. The caller's side comes from the session.
 */
export async function lockPartyTrade(
  tx: WebTx,
  userId: string,
  tradeId: string,
  parties: { fromUserId: string | null; toUserId: string | null },
) {
  const users = await lockParties(tx, [parties.fromUserId, parties.toUserId]);
  refusePoster(users.find((row) => row.id === userId));
  const trade = await lockTrade(tx, tradeId);
  const by: TradeSide = trade.fromUserId === userId ? "from" : "to";
  return { users, trade, by };
}

/**
 * Whether the trade's deadline has passed the drain's watermark, after which
 * a party can't cancel or dispute it and dodge the timers' abandoned mark.
 */
export async function isDue(tx: WebTx, trade: LockedTrade) {
  return (
    trade.deadlineAt !== null &&
    isTimedOut(trade.deadlineAt, await readWatermark(tx))
  );
}

/**
 * What a refused cancel or dispute answers. The refusals a cancel or
 * dispute can't reach read as the trade having changed.
 */
export const partyRefusals = {
  wrong_status: "trade_status_changed",
  deadline_passed: "trade_deadline_passed",
  already_started: "trade_cancel_started",
  wrong_party: "trade_status_changed",
  already_done: "trade_status_changed",
  no_such_item: "trade_status_changed",
} as const satisfies Record<PartyActionRefusal, TradeErrorCode>;

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
 * Ends a locked trade in the state a transition returned: its row, its
 * items' reservations, and its listing's outcome (listingEventAfter). A
 * released listing reopens when the poster could offer every token again
 * now that this trade no longer reserves them: `tokens` are the indexer's
 * states for the trade's tokens, which a caller that may release reads
 * before its transaction, so the transaction never waits on the indexer.
 * `users` are the parties the caller locked; the poster has no row once
 * their account is gone.
 */
export async function endTrade(
  tx: WebTx,
  trade: LockedTrade,
  next: TradeState,
  users: readonly LockedUser[],
  tokens: ReadonlyMap<number, TokenState>,
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

  const poster = users.find((row) => row.id === trade.fromUserId);
  const outcome = listingEventAfter(next, {
    banned: poster !== undefined && isBanActive(poster),
  });
  const listings = tradeListings(trade.items);
  if (outcome === undefined || listings.size === 0) return;

  await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(inArray(tradeOffers.id, [...listings.keys()]))
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  for (const [listingId, tokenIds] of listings) {
    let event = outcome;
    if (event === "release") {
      const flags = await readWebTokenFlags(tx, trade.fromAddress, tokenIds);
      event = canOfferAll(tokenIds, tokens, trade.fromAddress, flags)
        ? "reopen"
        : "break";
    }

    const { from, to } = listingTransition(event);
    await tx
      .update(tradeOffers)
      .set({
        status: to,
        endedAt: event === "reopen" ? null : sql`now()`,
        updatedAt: bumpUpdatedAt,
      })
      .where(
        and(
          eq(tradeOffers.id, listingId),
          eq(tradeOffers.kind, "listing"),
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
