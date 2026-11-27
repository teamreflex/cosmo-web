import { disputeReasons, paymentMethods } from "@apollo/database/web/types";
import { pgText } from "@apollo/trades/range";
import { EXTEND_HOURS } from "@apollo/trades/timers";
import * as z from "zod";
import {
  marketActivityStatuses,
  marketActivityViews,
} from "../market-activity";
import { myTradesTabs } from "../trades";

const tradeNoteSchema = pgText()
  .trim()
  .max(1000)
  .nullish()
  .transform((note) => note || null);

export const tradeIdInputSchema = z.strictObject({
  tradeId: z.uuid(),
});

// the side that didn't propose a pending offer declines it, or its proposer withdraws it
export const endOfferInputSchema = tradeIdInputSchema.extend({
  action: z.enum(["decline", "withdraw"]),
});

export const openDisputeInputSchema = tradeIdInputSchema.extend({
  reason: z.enum(disputeReasons),
  note: tradeNoteSchema,
});

// the recipient of a trade's payment says it arrived, and by which of the listing's methods
export const markPaidInputSchema = tradeIdInputSchema.extend({
  itemId: z.int().positive(),
});

export const confirmPaymentInputSchema = tradeIdInputSchema.extend({
  itemId: z.int().positive(),
  method: z.enum(paymentMethods),
});

// an objekt the caller is owed, for the other copies they could accept in its place
export const substituteCandidatesInputSchema = tradeIdInputSchema.extend({
  itemId: z.int().positive(),
});

// the receiver of an objekt accepts another copy, named by its transfer, in its place
export const acceptSubstituteInputSchema =
  substituteCandidatesInputSchema.extend({
    tokenId: z.int().nonnegative(),
    hash: z.string().regex(/^0x[0-9a-f]{64}$/i),
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

// the admin Market activity feed's Kind and Status filters
export const marketActivityFiltersSchema = z.strictObject({
  view: z.enum(marketActivityViews),
  status: z.enum(marketActivityStatuses).optional(),
});

// the feed is keyset-paged by each trade's latest change
export const marketActivityCursorSchema = z.strictObject({
  at: z.iso.datetime(),
  id: z.uuid(),
});

export const marketActivityInputSchema = marketActivityFiltersSchema.extend({
  cursor: marketActivityCursorSchema.optional(),
});

export type MarketActivityInput = z.infer<typeof marketActivityInputSchema>;

// the most collections a side of one offer's serials are read for
export const MAX_OFFER_SERIAL_SLUGS = 200;

// a Trade Matches partner, as matched against the caller's anchor list
export const offerSerialsInputSchema = z.strictObject({
  listId: z.uuid(),
  partnerId: z.string().min(1),
});
