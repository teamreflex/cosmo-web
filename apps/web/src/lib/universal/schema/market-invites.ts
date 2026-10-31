import { isAddress } from "@apollo/util";
import * as z from "zod";

export const marketInviteInputSchema = z.object({
  address: z.string().refine(isAddress),
});

export type MarketInviteInput = z.infer<typeof marketInviteInputSchema>;
