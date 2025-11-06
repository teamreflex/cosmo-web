import { z } from "zod";

export const baseEnvSchema = z.object({
  DB_URL: z.url(),
});
