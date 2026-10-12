import { disputeReasons } from "@apollo/database/web/types";
import { EXTEND_HOURS } from "@apollo/trades/timers";
import * as z from "zod";

const tradeNoteSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((note) => (note === undefined || note === "" ? null : note));

export const tradeIdInputSchema = z.strictObject({
  tradeId: z.uuid(),
});

export const openDisputeInputSchema = tradeIdInputSchema.extend({
  reason: z.enum(disputeReasons),
  note: tradeNoteSchema,
});

export const staffTradeInputSchema = tradeIdInputSchema.extend({
  note: tradeNoteSchema,
});

export const staffExtendTradeInputSchema = staffTradeInputSchema.extend({
  hours: z.literal(EXTEND_HOURS),
});
