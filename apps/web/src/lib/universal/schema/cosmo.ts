import * as z from "zod";

export const verifyCosmoSchema = z.object({
  otp: z.number(),
  ticket: z.string(),
});
