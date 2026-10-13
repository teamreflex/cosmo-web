import { tradeState } from "@apollo/trades/lifecycle";
import { isTimedOut } from "@apollo/trades/timers";
import { addr } from "@apollo/util";
import type {
  TradeItemView,
  TradeParty,
  TradeView,
} from "../../universal/trades";
import { toPublicUser } from "../auth.server";
import { db } from "../db";
import { readIndexed } from "./feed.server";
import { readWatermark } from "./trade.server";

/**
 * A trade as its page shows it, or null when the id isn't an accepted,
 * disputed or ended trade. Each unsent item's status comes from its token's
 * owner in the indexer while the trade is live.
 */
export async function readTradeView(
  tradeId: string,
): Promise<TradeView | null> {
  const row = await db.query.tradeOffers.findFirst({
    where: {
      id: tradeId,
      kind: "trade",
      status: {
        in: ["accepted", "disputed", "completed", "cancelled", "timed_out"],
      },
    },
    columns: {
      id: true,
      status: true,
      fromUserId: true,
      toUserId: true,
      fromAddress: true,
      toAddress: true,
      cancelledBy: true,
      abandonedBy: true,
      createdAt: true,
      acceptedAt: true,
      deadlineAt: true,
      endedAt: true,
    },
    with: {
      items: { orderBy: { id: "asc" } },
      messages: {
        where: { kind: "event" },
        columns: { id: true, event: true, createdAt: true },
        orderBy: { id: "asc" },
      },
      fromUser: true,
      toUser: true,
      fromCosmo: { columns: { username: true } },
      toCosmo: { columns: { username: true } },
    },
  });
  if (!row) return null;
  if (row.acceptedAt === null || row.deadlineAt === null) {
    throw new Error("accepted trade without a deadline");
  }

  const [indexed, watermark] = await Promise.all([
    readIndexed(
      [...new Set(row.items.flatMap((item) => item.slug ?? []))],
      row.items.flatMap((item) => item.tokenId ?? []),
    ),
    readWatermark(db),
  ]);
  const state = tradeState(row, row.items);
  const live = state.status === "accepted" || state.status === "disputed";
  const pinned = {
    from: addr(row.fromAddress),
    to: row.toAddress === null ? null : addr(row.toAddress),
  };
  const events = row.messages.flatMap(({ id, createdAt, event }) =>
    event === null ? [] : [{ id, createdAt, event }],
  );

  const party = (
    userId: string | null,
    user: typeof row.fromUser,
    cosmo: { username: string } | null,
  ): TradeParty =>
    userId === null
      ? { user: null, cosmoUsername: null }
      : {
          user: user && toPublicUser(user),
          cosmoUsername: cosmo?.username ?? null,
        };

  return {
    id: row.id,
    state,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    deadlineAt: row.deadlineAt,
    endedAt: row.endedAt,
    pausedAt:
      state.status === "disputed"
        ? (events.findLast(({ event }) => event.type === "disputed")
            ?.createdAt ?? null)
        : null,
    deadlinePassed:
      state.status === "accepted" && isTimedOut(row.deadlineAt, watermark),
    listingId:
      row.items.find((item) => item.listingId !== null)?.listingId ?? null,
    parties: {
      from: party(row.fromUserId, row.fromUser, row.fromCosmo),
      to: party(row.toUserId, row.toUser, row.toCosmo),
    },
    items: row.items.map((item): TradeItemView => {
      const token =
        item.tokenId === null ? undefined : indexed.states.get(item.tokenId);
      const found = token?.kind === "found" ? token : undefined;
      return {
        id: item.id,
        sender: item.sender,
        kind: item.kind,
        tokenId: item.tokenId,
        slug: item.slug,
        serial: found?.serial ?? null,
        collection:
          item.slug === null
            ? null
            : (indexed.collections.get(item.slug) ?? null),
        transferredAt: item.transferredAt,
        txHash: item.txHash,
        // recorded first, then the indexed owner while the trade is live
        status:
          item.transferredAt !== null
            ? "sent"
            : !live
              ? "not_sent"
              : found === undefined
                ? "waiting"
                : found.owner === pinned[item.sender === "from" ? "to" : "from"]
                  ? "arrived"
                  : found.owner !== pinned.from && found.owner !== pinned.to
                    ? "moved"
                    : found.transferable
                      ? "waiting"
                      : "untransferable",
      };
    }),
    events,
  };
}
