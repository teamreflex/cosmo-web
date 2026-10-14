/**
 * Redis channel for trades whose rows changed. apps/web and apps/schedules
 * publish on it after their transaction commits, and apps/chat subscribes.
 */
export const TRADE_EVENTS_CHANNEL = "trade-events";

export type TradeUpdate = { type: "updated"; tradeId: string };

/**
 * The message announcing that the trade's row changed.
 */
export function tradeUpdateMessage(tradeId: string) {
  return JSON.stringify({ type: "updated", tradeId } satisfies TradeUpdate);
}
