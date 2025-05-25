import { z } from "zod/v4";

export const verifyCosmoSchema = z.object({
  otp: z.coerce.number(),
  ticket: z.string(),
});
