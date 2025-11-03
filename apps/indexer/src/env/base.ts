import { z } from "zod";

export const baseEnvSchema = z.object({
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASS: z.string().min(1),
  DB_PORT: z.coerce.number().positive(),
  DB_HOST: z.string().min(1),
  DB_READ_USER: z.string().min(1),
  DB_READ_PASS: z.string().min(1),
});
