import { redis } from "@/lib/server/cache.server";
import {
  TRADE_EVENTS_CHANNEL,
  tradeUpdateMessage,
} from "@apollo/trades/events";

/**
 * Announce trades whose rows changed on the `trade-events` channel, once the
 * transaction that changed them has committed.
 */
export async function publishTradeUpdates(tradeIds: readonly string[]) {
  await Promise.all(
    tradeIds.map((tradeId) =>
      redis.publish(TRADE_EVENTS_CHANNEL, tradeUpdateMessage(tradeId)),
    ),
  );
}
