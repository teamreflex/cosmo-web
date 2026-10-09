import * as z from "zod";

export const deleteAccountSchema = z.object({
  token: z.string().min(1),
});
