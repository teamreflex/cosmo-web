import type {
  DeletionBlocker,
  LiveTradeSummary,
} from "@/lib/universal/account-deletion";
import { tradeOffers } from "@apollo/database/web/schema";
import { liveTradeStatuses } from "@apollo/database/web/types";
import { and, eq, sql } from "drizzle-orm";
import type { DbOrTx, WebTx } from "./db";

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
 * Withdraw the user's open listings and the direct offers they sent, and
 * decline the offers they received, ahead of deleting their account. Live
 * trades block deletion, so nothing reserved is touched.
 */
export async function closeOpenOffers(tx: WebTx, userId: string) {
  const endedAt = sql`now()`;

  await tx
    .update(tradeOffers)
    .set({ status: "withdrawn", endedAt })
    .where(
      and(
        eq(tradeOffers.fromUserId, userId),
        sql`(${tradeOffers.kind}, ${tradeOffers.status}) IN (('listing', 'open'), ('trade', 'pending'))`,
      ),
    );

  await tx
    .update(tradeOffers)
    .set({ status: "declined", endedAt })
    .where(
      and(
        eq(tradeOffers.toUserId, userId),
        eq(tradeOffers.kind, "trade"),
        eq(tradeOffers.status, "pending"),
      ),
    );
}
