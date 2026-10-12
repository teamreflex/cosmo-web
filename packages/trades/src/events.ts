/**
 * Redis channel for trades whose rows changed. apps/web and apps/schedules
 * publish on it after their transaction commits, and apps/chat will
 * subscribe.
 */
export const TRADE_EVENTS_CHANNEL = "trade-events";

export type TradeUpdate = { type: "updated"; tradeId: string };
