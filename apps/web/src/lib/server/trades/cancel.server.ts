import { bumpUpdatedAt } from "@apollo/database/web/sql";
import { partyAction } from "@apollo/trades/lifecycle";
import { db } from "../db";
import { consumeRateLimit } from "../rate-limit.server";
import { publishTradeUpdates } from "../trade-events.server";
import {
  insertTradeEvent,
  isPastDeadline,
  lockPartyTrade,
  partyRefusals,
  partyTrade,
  refuseTrade,
  updateLockedTrade,
} from "./trade.server";

// asking, taking back, keeping and agreeing share one limit, so a loop can't flood the other party's bell
export async function consumeCancelRequestLimit(userId: string) {
  await consumeRateLimit({
    key: `trade-cancel-request:${userId}`,
    limit: 10,
    window: "10 minutes",
  });
}

/**
 * Answer or take back a request to cancel without ending the trade: the
 * side that asked withdraws it, or the other side keeps the trade going.
 * Either shows in the timeline and notifies no one.
 */
export async function dropCancelRequest(
  userId: string,
  tradeId: string,
  type: "withdraw_cancel" | "decline_cancel",
) {
  await consumeCancelRequestLimit(userId);

  const parties = await partyTrade(userId, tradeId);
  await db.transaction(async (tx) => {
    const { trade, by } = await lockPartyTrade(tx, userId, tradeId, parties);

    const result = partyAction(
      trade.state,
      { type, by },
      { deadlinePassed: await isPastDeadline(tx, trade), arrived: false },
    );
    if (!result.ok) refuseTrade(partyRefusals[result.reason]);

    await updateLockedTrade(tx, trade, {
      cancelRequestedBy: null,
      updatedAt: bumpUpdatedAt,
    });
    await insertTradeEvent(
      tx,
      trade.id,
      type === "withdraw_cancel"
        ? { type: "cancel_request_withdrawn", by }
        : { type: "cancel_request_declined", by },
    );
  });
  await publishTradeUpdates([tradeId]);
}
