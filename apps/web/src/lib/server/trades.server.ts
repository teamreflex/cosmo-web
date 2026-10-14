import type {
  DeletionBlocker,
  LiveTradeSummary,
} from "@/lib/universal/account-deletion";
import { tradeOffers } from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import { liveTradeStatuses } from "@apollo/database/web/types";
import { and, asc, eq, or, sql } from "drizzle-orm";
import type { DbOrTx, WebTx } from "./db";

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
 * Close the user's open listings with `listingStatus` (withdrawn when they
 * delete their account, removed when staff ban them), withdraw the direct
 * offers they sent and decline the offers they received. The rows are locked
 * in id order first, since a multi-row update locks in scan order and the
 * outbox drain locks a poster's listings in id order to break them. Accepted
 * and disputed trades are left alone: they block deletion, and a ban disputes
 * them first.
 */
export async function closeOpenOffers(
  tx: WebTx,
  userId: string,
  listingStatus: "withdrawn" | "removed",
) {
  const sent = and(
    eq(tradeOffers.fromUserId, userId),
    sql`(${tradeOffers.kind}, ${tradeOffers.status}) IN (('listing', 'open'), ('trade', 'pending'))`,
  );
  const received = and(
    eq(tradeOffers.toUserId, userId),
    eq(tradeOffers.kind, "trade"),
    eq(tradeOffers.status, "pending"),
  );
  await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(or(sent, received))
    .orderBy(asc(tradeOffers.id))
    .for("no key update");

  await tx
    .update(tradeOffers)
    .set({
      status: sql`CASE WHEN ${tradeOffers.kind} = 'listing' THEN ${listingStatus}::trade_offer_status ELSE 'withdrawn' END`,
      endedAt: sql`now()`,
      updatedAt: bumpUpdatedAt,
    })
    .where(sent);

  await tx
    .update(tradeOffers)
    .set({ status: "declined", endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
    .where(received);
}
