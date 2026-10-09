import { isAddress } from "@apollo/util";
import * as z from "zod";

export const transferCosmoAccountSchema = z
  .object({
    address: z.string().refine(isAddress),
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
  })
  .refine((value) => value.fromUserId !== value.toUserId, {
    message: "Pick a different account to move it to.",
    path: ["toUserId"],
  });

export const cosmoTransferSearchSchema = z.object({
  query: z.string().min(3),
});

export type TransferCosmoAccount = z.infer<typeof transferCosmoAccountSchema>;
