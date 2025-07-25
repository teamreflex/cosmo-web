import { z } from "zod";

export const verifyCosmoSchema = z.object({
  otp: z.coerce.number<number>(),
  ticket: z.string(),
});
