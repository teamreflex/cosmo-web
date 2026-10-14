import { listDrainCursor } from "@apollo/database/web/schema";
import {
  endedTradeStatuses,
  liveTradeStatuses,
  type ReportStatus,
  type TradeEvent,
} from "@apollo/database/web/types";
import { type TradeState, tradeState } from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME, isTimedOut } from "@apollo/trades/timers";
import { itemStatus } from "@apollo/trades/transfers";
import { sql } from "drizzle-orm";
import type {
  TradeDispute,
  TradeItemView,
  TradeParty,
  TradeView,
} from "../../universal/trades";
import { type ServerUser, toPublicUser } from "../auth.server";
import { db } from "../db";
import { readIndexed } from "./feed.server";

/**
 * The drain's watermark as a scalar subquery, so a trade read gets it in
 * the same statement.
 */
export const watermarkExtra = () =>
  sql<Date | null>`(select ${listDrainCursor.chainTime} from ${listDrainCursor} where ${listDrainCursor.name} = ${DRAIN_CURSOR_NAME})`.mapWith(
    listDrainCursor.chainTime,
  );

// both parties' users and the COSMO accounts behind their pinned addresses
export const tradePartyRelations = {
  fromUser: true,
  toUser: true,
  fromCosmo: { columns: { username: true } },
  toCosmo: { columns: { username: true } },
} as const;

/**
 * One side as a trade shows it. A deleted party's pinned address may since
 * belong to someone else, so neither name is shown.
 */
export function toTradeParty(
  userId: string | null,
  user: ServerUser | null,
  cosmo: { username: string } | null,
): TradeParty {
  return userId === null
    ? { user: null, cosmoUsername: null }
    : {
        user: user && toPublicUser(user),
        cosmoUsername: cosmo?.username ?? null,
      };
}

// the listing a trade was claimed from, which every listing item names
export function tradeListingId(items: { listingId: string | null }[]) {
  return items.find((item) => item.listingId !== null)?.listingId ?? null;
}

/**
 * Whether an accepted trade's deadline has passed the drain's watermark, so
 * its parties can no longer act.
 */
export function deadlinePassed(
  state: TradeState,
  deadlineAt: Date,
  watermark: Date | null,
) {
  return state.status === "accepted" && isTimedOut(deadlineAt, watermark);
}

/**
 * The dispute that froze a disputed trade, from its events, newest last.
 * Null for any other status.
 */
export function tradeDispute(
  state: TradeState,
  events: readonly { createdAt: Date; event: TradeEvent | null }[],
): TradeDispute | null {
  if (state.status !== "disputed") return null;
  for (const { createdAt, event } of events.toReversed()) {
    if (event?.type === "disputed") return { at: createdAt, event };
  }
  return null;
}

/**
 * A trade as its page shows it, with its dispute report for staff, or null
 * when the id isn't an accepted, disputed or ended trade. Each unsent item's
 * status comes from its token's owner in the indexer while the trade is
 * live. The drain's watermark comes back with the row, in one statement.
 */
export async function readTradeView(tradeId: string): Promise<{
  trade: TradeView;
  disputeReport: { id: string; status: ReportStatus } | null;
} | null> {
  const row = await db.query.tradeOffers.findFirst({
    where: {
      id: tradeId,
      kind: "trade",
      status: { in: [...liveTradeStatuses, ...endedTradeStatuses] },
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
      deadlineAt: true,
      endedAt: true,
    },
    extras: { watermark: watermarkExtra },
    with: {
      items: { orderBy: { id: "asc" } },
      messages: {
        where: { kind: "event" },
        columns: { id: true, event: true, createdAt: true },
        orderBy: { id: "asc" },
      },
      ...tradePartyRelations,
      disputeReport: { columns: { id: true, status: true } },
    },
  });
  if (!row) return null;
  if (row.deadlineAt === null) {
    throw new Error("accepted trade without a deadline");
  }

  const indexed = await readIndexed(
    [...new Set(row.items.flatMap((item) => item.slug ?? []))],
    row.items.flatMap((item) => item.tokenId ?? []),
  );
  const state = tradeState(row, row.items);
  const live = state.status === "accepted" || state.status === "disputed";
  const events = row.messages.flatMap(({ id, createdAt, event }) =>
    event === null ? [] : [{ id, createdAt, event }],
  );

  const trade: TradeView = {
    id: row.id,
    state,
    deadlineAt: row.deadlineAt,
    endedAt: row.endedAt,
    dispute: tradeDispute(state, events),
    deadlinePassed: deadlinePassed(state, row.deadlineAt, row.watermark),
    listingId: tradeListingId(row.items),
    parties: {
      from: toTradeParty(row.fromUserId, row.fromUser, row.fromCosmo),
      to: toTradeParty(row.toUserId, row.toUser, row.toCosmo),
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
        status: itemStatus(item, found, {
          live,
          fromAddress: row.fromAddress,
          toAddress: row.toAddress,
        }),
      };
    }),
    events,
  };
  return { trade, disputeReport: row.disputeReport };
}
