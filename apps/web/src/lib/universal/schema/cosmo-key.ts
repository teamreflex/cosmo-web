import * as z from "zod";

export const cosmoKeySchema = z.object({
  key: z.string().min(1),
});
