import { disputeReasons } from "@apollo/database/web/types";
import { EXTEND_HOURS } from "@apollo/trades/timers";
import * as z from "zod";

export const tradeIdInputSchema = z.strictObject({
  tradeId: z.uuid(),
});

export type TradeIdInput = z.infer<typeof tradeIdInputSchema>;

const tradeNoteSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((note) => (note === undefined || note === "" ? null : note));

export const openDisputeInputSchema = z.strictObject({
  tradeId: z.uuid(),
  reason: z.enum(disputeReasons),
  note: tradeNoteSchema,
});

export const staffTradeInputSchema = z.strictObject({
  tradeId: z.uuid(),
  note: tradeNoteSchema,
});

export const staffExtendTradeInputSchema = z.strictObject({
  tradeId: z.uuid(),
  note: tradeNoteSchema,
  hours: z.literal(EXTEND_HOURS),
});
