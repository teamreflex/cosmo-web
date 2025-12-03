import * as z from "zod";

const envSchema = z.object({
  RPC_RATE_LIMIT: z.coerce.number().positive().default(2),
  RPC_FINALITY: z.coerce.number().positive().default(60),
  RPC_ENDPOINT: z.url(),
  SQD_ENDPOINT: z.url(),
  ENABLE_OBJEKTS: z.preprocess((x) => x === "true", z.coerce.boolean()),
  ENABLE_GRAVITY: z.preprocess((x) => x === "true", z.coerce.boolean()),
  COSMO_PARALLEL_COUNT: z.coerce.number().positive().default(500),
  DB_URL: z.url(),
  // legacy variables for backwards compatibility
  DB_NAME: z.string(),
  DB_READ_USER: z.string(),
  DB_READ_PASS: z.string(),
});

export const env = envSchema.parse(process.env);
