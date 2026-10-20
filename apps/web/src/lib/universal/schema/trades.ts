import { disputeReasons } from "@apollo/database/web/types";
import { pgText } from "@apollo/trades/range";
import { EXTEND_HOURS } from "@apollo/trades/timers";
import * as z from "zod";
import { myTradesTabs } from "../trades";

const tradeNoteSchema = pgText()
  .trim()
  .max(1000)
  .nullish()
  .transform((note) => note || null);

export const tradeIdInputSchema = z.strictObject({
  tradeId: z.uuid(),
});

// the recipient declines a pending offer, or its sender withdraws it
export const endOfferInputSchema = tradeIdInputSchema.extend({
  action: z.enum(["decline", "withdraw"]),
});

export const openDisputeInputSchema = tradeIdInputSchema.extend({
  reason: z.enum(disputeReasons),
  note: tradeNoteSchema,
});

/**
 * A staff action names the dispute report it was taken from, or null for a
 * trade with no dispute, so a stale view can't act on a trade that has since
 * moved on.
 */
export const staffTradeInputSchema = tradeIdInputSchema.extend({
  reportId: z.uuid().nullable(),
  note: tradeNoteSchema,
});

export const staffExtendTradeInputSchema = staffTradeInputSchema.extend({
  hours: z.literal(EXTEND_HOURS),
});

/**
 * The previous page's last trade on either tab: the value it sorted by when
 * that page was read, to the microsecond, and its id. Carrying the value
 * keeps the page boundary in place when that trade is accepted since.
 */
export const myTradesCursorSchema = z.strictObject({
  at: z.iso.datetime(),
  id: z.uuid(),
});

export const myTradesInputSchema = z.strictObject({
  tab: z.enum(myTradesTabs),
  cursor: myTradesCursorSchema.optional(),
});

// the most collections a side of one offer-serials request may name
export const MAX_OFFER_SERIAL_SLUGS = 200;

/**
 * The collections Trade Matches shows for one partner, up to
 * MAX_OFFER_SERIAL_SLUGS a side: the caller's (`give`) and the partner's
 * (`get`).
 */
export const offerSerialsInputSchema = z.strictObject({
  partnerId: z.string().min(1),
  give: z.array(z.string().min(1)).max(MAX_OFFER_SERIAL_SLUGS),
  get: z.array(z.string().min(1)).max(MAX_OFFER_SERIAL_SLUGS),
});
