import { listDrainCursor, tradeOffers } from "@apollo/database/web/schema";
import {
  endedTradeStatuses,
  liveTradeStatuses,
  type ReportStatus,
  type TradeEvent,
  type TradeSide,
} from "@apollo/database/web/types";
import { type TradeState, tradeState } from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME, isTimedOut } from "@apollo/trades/timers";
import { itemStatus } from "@apollo/trades/transfers";
import { sql } from "drizzle-orm";
import {
  toFeedbackRep,
  tradeFeedbackView,
  type VisibleFeedbackRow,
} from "../../universal/feedback";
import type {
  TradeDispute,
  TradeItemView,
  TradeParty,
  TradePartyName,
  TradeView,
} from "../../universal/trades";
import { type ServerUser, toPublicUser } from "../auth.server";
import { db } from "../db";
import { feedbackRepColumns } from "../feedback.server";
import { readIndexed } from "./feed.server";

/**
 * The drain's watermark as a scalar subquery, so a trade read gets it in
 * the same statement.
 */
export const watermarkExtra = () =>
  sql<Date | null>`(select ${listDrainCursor.chainTime} from ${listDrainCursor} where ${listDrainCursor.name} = ${DRAIN_CURSOR_NAME})`.mapWith(
    listDrainCursor.chainTime,
  );

/**
 * One side as a trade shows it. A deleted party's pinned address may since
 * belong to someone else, so neither its name nor its rating is shown.
 */
function toTradeParty(
  userId: string | null,
  user: ServerUser | null,
  cosmo: { username: string } | null,
  stats: Parameters<typeof toFeedbackRep>[0],
): TradeParty {
  const party = toPartyName(userId, user, cosmo);
  return { ...party, rep: party.user === null ? null : toFeedbackRep(stats) };
}

// one side's name without its rating, for lists that don't show ratings
export function toPartyName(
  userId: string | null,
  user: ServerUser | null,
  cosmo: { username: string } | null,
): TradePartyName {
  return userId === null || user === null
    ? { user: null, cosmoUsername: null }
    : { user: toPublicUser(user), cosmoUsername: cosmo?.username ?? null };
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

// what a party's trade page reads of each rating
const feedbackColumns = {
  id: true,
  raterSide: true,
  rating: true,
  comment: true,
  communication: true,
  speed: true,
  createdAt: true,
  removedAt: true,
} as const satisfies Record<keyof VisibleFeedbackRow, true>;

/**
 * Who reads a trade: a signed-in user, or staff reading it from a report.
 */
type TradeReader = { kind: "user"; userId: string } | { kind: "staff" };

/**
 * The reader against the trade's parties. A user who is a party reads it as
 * one even when they are staff; anyone else reads it as staff, and the
 * caller decides whether they may.
 */
type TradeReadViewer = { kind: "party"; side: TradeSide } | { kind: "staff" };

/**
 * A trade as its page shows it, with its dispute report for staff and who
 * reads it, or null when the id isn't an accepted, disputed or ended trade.
 * Each unsent item's status comes from its token's owner in the indexer
 * while the trade is live. The drain's watermark comes back with the row,
 * in one statement.
 */
export async function readTradeView(
  tradeId: string,
  reader: TradeReader,
): Promise<{
  trade: TradeView;
  disputeReport: { id: string; status: ReportStatus } | null;
  viewer: TradeReadViewer;
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
    extras: {
      watermark: watermarkExtra,
      now: () => sql<Date>`now()`.mapWith(tradeOffers.endedAt),
    },
    with: {
      items: { orderBy: { id: "asc" } },
      /**
       * A party's own rating, and the other party's while no moderator
       * removed it. Staff read none.
       */
      feedback: {
        columns: feedbackColumns,
        where: {
          RAW: (t) =>
            reader.kind === "staff"
              ? sql`false`
              : sql`${t.fromUserId} = ${reader.userId} or ${t.removedAt} is null`,
        },
      },
      messages: {
        where: { kind: "event" },
        columns: { id: true, event: true, createdAt: true },
        orderBy: { id: "asc" },
      },
      /**
       * Both parties' users, and the COSMO accounts and feedback stats
       * behind their pinned addresses.
       */
      fromUser: true,
      toUser: true,
      fromCosmo: { columns: { username: true } },
      toCosmo: { columns: { username: true } },
      fromStats: { columns: feedbackRepColumns },
      toStats: { columns: feedbackRepColumns },
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
  const viewer: TradeReadViewer =
    reader.kind === "user" && row.fromUserId === reader.userId
      ? { kind: "party", side: "from" }
      : reader.kind === "user" && row.toUserId === reader.userId
        ? { kind: "party", side: "to" }
        : { kind: "staff" };
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
      from: toTradeParty(
        row.fromUserId,
        row.fromUser,
        row.fromCosmo,
        row.fromStats,
      ),
      to: toTradeParty(row.toUserId, row.toUser, row.toCosmo, row.toStats),
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
    feedback:
      viewer.kind === "staff"
        ? { state: "none" }
        : tradeFeedbackView({
            state,
            side: viewer.side,
            endedAt: row.endedAt,
            now: row.now,
            rows: row.feedback,
            counterpartExists:
              (viewer.side === "from" ? row.toUser : row.fromUser) !== null,
          }),
  };
  return { trade, disputeReport: row.disputeReport, viewer };
}
