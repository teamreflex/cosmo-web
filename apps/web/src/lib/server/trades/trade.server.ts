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
import type {
  NewNotification,
  StoredReportReason,
  TradeEvent as StoredTradeEvent,
  TradeNotificationType,
} from "@apollo/database/web/types";
import {
  listingEventAfter,
  listingTransition,
  type TradeState,
  tradeState,
} from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME } from "@apollo/trades/timers";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import type { DbOrTx, WebTx } from "../db";
import {
  firstRefusal,
  readIndexerTokens,
  readWebTokenFlags,
} from "./holdings.server";
import { bumpUpdatedAt } from "./listings.server";

/**
 * A user row a trade write has locked, with what the ban check reads.
 */
export type LockedUser = {
  id: string;
  banned: boolean;
  banExpires: Date | null;
};

/**
 * Locks the rows of the users a trade write involves `FOR SHARE` in one
 * statement ordered by id, before any trade row, so the write can't
 * interleave with a deletion or a ban. A user whose account is gone has no
 * row.
 */
export function lockParties(
  tx: WebTx,
  userIds: readonly (string | null)[],
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
    .for("share");
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
  if (!row) {
    throw new ExpectedError("trade_not_found" satisfies TradeErrorCode);
  }

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
 * The drain's chain-time watermark, which deadlines are judged against, or
 * null before the drain has stamped one.
 */
export async function readWatermark(executor: DbOrTx) {
  const [cursor] = await executor
    .select({ chainTime: listDrainCursor.chainTime })
    .from(listDrainCursor)
    .where(eq(listDrainCursor.name, DRAIN_CURSOR_NAME));
  return cursor?.chainTime ?? null;
}

/**
 * Ends a locked trade in the state a transition returned: its row, its
 * items' reservations, and its listing's outcome (listingEventAfter). A
 * released listing reopens when the poster could offer every token again
 * now that this trade no longer reserves them, which is read only then.
 * `poster` is their locked row, missing once their account is gone.
 */
export async function endTrade(
  tx: WebTx,
  trade: LockedTrade,
  next: TradeState,
  poster: LockedUser | undefined,
) {
  const [ended] = await tx
    .update(tradeOffers)
    .set({
      status: next.status,
      endedAt: sql`now()`,
      cancelledBy: next.status === "cancelled" ? next.cancelledBy : null,
      abandonedBy: next.status === "timed_out" ? next.abandonedBy : null,
    })
    .where(
      and(
        eq(tradeOffers.id, trade.id),
        eq(tradeOffers.status, trade.state.status),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!ended) throw new Error("Trade changed under its lock");

  await tx
    .update(tradeOfferItems)
    .set({ live: false })
    .where(
      and(
        eq(tradeOfferItems.offerId, trade.id),
        eq(tradeOfferItems.live, true),
      ),
    );

  const listings = Map.groupBy(
    trade.items.flatMap(({ listingId, tokenId }) =>
      listingId === null || tokenId === null ? [] : [{ listingId, tokenId }],
    ),
    (item) => item.listingId,
  );
  if (listings.size === 0) return;

  await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(inArray(tradeOffers.id, [...listings.keys()]))
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  const banned = poster !== undefined && isBanActive(poster);
  for (const [listingId, tokens] of listings) {
    let event = listingEventAfter(next, { banned });
    if (event === undefined) continue;
    if (event === "release") {
      const tokenIds = tokens.map((token) => token.tokenId);
      const holdings = {
        states: await readIndexerTokens(tokenIds),
        ...(await readWebTokenFlags(tx, trade.fromAddress, tokenIds)),
      };
      event =
        firstRefusal(tokenIds, holdings, trade.fromAddress) === null
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
 * Files a trade report on a locked accepted trade and freezes the trade
 * under it: it becomes disputed, and its deadline stops counting until
 * staff act. Returns the report's id for the timeline event.
 */
export async function disputeTrade(
  tx: WebTx,
  trade: LockedTrade,
  report: {
    reporterId: string;
    reason: StoredReportReason;
    note: string | null;
  },
) {
  const [inserted] = await tx
    .insert(reports)
    .values({ ...report, targetType: "trade", targetId: trade.id })
    .returning({ id: reports.id });
  if (!inserted) throw new Error("Report insert returned no row");

  const [disputed] = await tx
    .update(tradeOffers)
    .set({ status: "disputed", disputeReportId: inserted.id })
    .where(
      and(
        eq(tradeOffers.id, trade.id),
        eq(tradeOffers.status, trade.state.status),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!disputed) throw new Error("Trade changed under its lock");

  return inserted.id;
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
  notification: Omit<
    Extract<NewNotification, { type: TradeNotificationType }>,
    "userId"
  >,
) {
  const values = recipients.flatMap((recipient) =>
    isBanActive(recipient) ? [] : [{ ...notification, userId: recipient.id }],
  );
  if (values.length > 0) await tx.insert(notifications).values(values);
}
