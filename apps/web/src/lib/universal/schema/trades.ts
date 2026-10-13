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

export const myTradesInputSchema = z.strictObject({
  tab: z.enum(myTradesTabs),
});
