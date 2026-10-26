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

// the most collections a side of one offer's serials are read for
export const MAX_OFFER_SERIAL_SLUGS = 200;

// a Trade Matches partner, as matched against the caller's anchor list
export const offerSerialsInputSchema = z.strictObject({
  listId: z.uuid(),
  partnerId: z.string().min(1),
});
