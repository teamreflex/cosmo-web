import type {
  DeletionBlocker,
  LiveTradeSummary,
} from "@/lib/universal/account-deletion";
import { isBanActive } from "@apollo/auth/guard";
import {
  notifications,
  tradeMessages,
  tradeOffers,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import {
  liveTradeStatuses,
  type NewNotification,
} from "@apollo/database/web/types";
import { listingTransition, offerTransition } from "@apollo/trades/lifecycle";
import { and, asc, eq, or, sql } from "drizzle-orm";
import type { DbOrTx, WebTx } from "./db";
import type { LockedUser } from "./trades/trade.server";

/**
 * The trade or offer has the user as either party.
 */
export function tradeParty(userId: string) {
  return or(
    eq(tradeOffers.fromUserId, userId),
    eq(tradeOffers.toUserId, userId),
  );
}

/**
 * The user's accepted and disputed trades, which keep them from deleting
 * their account until each one ends. Each names the other party by the COSMO
 * account behind their pinned address.
 */
export async function liveTradesBlocker(
  executor: DbOrTx,
  userId: string,
): Promise<DeletionBlocker | null> {
  const trades = await executor.query.tradeOffers.findMany({
    where: {
      kind: "trade",
      status: { in: [...liveTradeStatuses] },
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    columns: {
      id: true,
      status: true,
      fromUserId: true,
      fromAddress: true,
      toAddress: true,
      deadlineAt: true,
    },
    with: {
      fromCosmo: { columns: { username: true } },
      toCosmo: { columns: { username: true } },
      items: { columns: { sender: true }, where: { kind: "payment" } },
    },
    orderBy: { deadlineAt: "asc" },
  });

  const [first, ...rest] = trades.map((trade): LiveTradeSummary => {
    const side = trade.fromUserId === userId ? "from" : "to";
    const other =
      side === "from"
        ? { cosmo: trade.toCosmo, address: trade.toAddress }
        : { cosmo: trade.fromCosmo, address: trade.fromAddress };
    const [payment] = trade.items;

    return {
      id: trade.id,
      kind:
        payment === undefined
          ? "trade"
          : payment.sender === side
            ? "purchase"
            : "sale",
      // the trade checks guarantee both addresses
      counterparty: other.cosmo?.username ?? other.address ?? "",
      state:
        trade.status === "disputed" || trade.deadlineAt === null
          ? { kind: "disputed" }
          : { kind: "deadline", at: trade.deadlineAt },
    };
  });

  return first === undefined
    ? null
    : { kind: "live-trades", trades: [first, ...rest] };
}

/**
 * Close the user's open listings, withdraw the direct offers they sent and
 * decline the offers they received, putting each offer's ending on its
 * timeline, which names the deletion or the ban that closed them rather
 * than a party. Deleting the account withdraws the listings and tells no
 * one; a ban removes the listings and tells the sender of each declined
 * offer, whose row the ban holds locked in `notify`. The pending offers,
 * then the listings, are locked in id order first (docs/auth.md), as the
 * outbox drain locks them to turn offers stale and break listings, since a
 * multi-row update locks in scan order. Accepted and disputed trades are
 * left alone: they block deletion, and a ban disputes them first.
 */
export async function closeOpenOffers(
  tx: WebTx,
  userId: string,
  closer: { by: "deletion" } | { by: "staff"; notify: readonly LockedUser[] },
) {
  const listing = listingTransition(
    closer.by === "staff" ? "remove" : "withdraw",
  );
  const withdraw = offerTransition("withdraw");
  const decline = offerTransition("decline");
  // only open listings: a claimed one's trade is live, which a deletion waits for and a ban disputes
  const sent = and(
    eq(tradeOffers.fromUserId, userId),
    or(
      and(eq(tradeOffers.kind, "listing"), eq(tradeOffers.status, "open")),
      and(eq(tradeOffers.kind, "trade"), eq(tradeOffers.status, withdraw.from)),
    ),
  );
  const received = and(
    eq(tradeOffers.toUserId, userId),
    eq(tradeOffers.kind, "trade"),
    eq(tradeOffers.status, decline.from),
  );
  await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(
      and(
        tradeParty(userId),
        eq(tradeOffers.kind, "trade"),
        eq(tradeOffers.status, "pending"),
      ),
    )
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.fromUserId, userId),
        eq(tradeOffers.kind, "listing"),
        eq(tradeOffers.status, "open"),
      ),
    )
    .orderBy(asc(tradeOffers.id))
    .for("no key update");

  const withdrawn = await tx
    .update(tradeOffers)
    .set({
      status: sql`CASE WHEN ${tradeOffers.kind} = 'listing' THEN ${listing.to}::trade_offer_status ELSE ${withdraw.to}::trade_offer_status END`,
      endedAt: sql`now()`,
      updatedAt: bumpUpdatedAt,
    })
    .where(sent)
    .returning({ id: tradeOffers.id, kind: tradeOffers.kind });
  const declined = await tx
    .update(tradeOffers)
    .set({ status: decline.to, endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
    .where(received)
    .returning({ id: tradeOffers.id, fromUserId: tradeOffers.fromUserId });

  // each offer's ending on its timeline, put down to the ban or the deletion
  const events = [
    ...withdrawn.flatMap(
      ({ id, kind }): (typeof tradeMessages.$inferInsert)[] =>
        kind === "trade"
          ? [
              {
                tradeId: id,
                kind: "event",
                event: { type: "withdrawn", by: closer.by },
              },
            ]
          : [],
    ),
    ...declined.map(({ id }): typeof tradeMessages.$inferInsert => ({
      tradeId: id,
      kind: "event",
      event: { type: "declined", by: closer.by },
    })),
  ];
  if (events.length > 0) await tx.insert(tradeMessages).values(events);

  // a ban's declines tell their senders, without naming who was banned, skipping a banned sender
  const told =
    closer.by === "staff"
      ? declined.flatMap(({ id, fromUserId }) =>
          closer.notify.flatMap((row): NewNotification[] =>
            row.id === fromUserId && !isBanActive(row)
              ? [
                  {
                    type: "offer_declined",
                    userId: row.id,
                    offerId: id,
                    actorId: null,
                    tokenId: null,
                  },
                ]
              : [],
          ),
        )
      : [];
  if (told.length > 0) await tx.insert(notifications).values(told);
}
