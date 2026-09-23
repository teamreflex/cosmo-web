import * as z from "zod";

const envSchema = z.object({
  RPC_RATE_LIMIT: z.coerce.number().positive().default(2),
  RPC_FINALITY: z.coerce.number().positive().default(60),
  RPC_ENDPOINT: z.url(),
  SQD_ENDPOINT: z.url(),
  SQD_KEY: z.string(),
  ENABLE_OBJEKTS: z.preprocess((x) => x === "true", z.coerce.boolean()),
  ENABLE_GRAVITY: z.preprocess((x) => x === "true", z.coerce.boolean()),
  COSMO_PARALLEL_COUNT: z.coerce.number().positive().default(500),
  DB_URL: z.url(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ACCESS_KEY: z.string().min(1),
  R2_SECRET_KEY: z.string().min(1),
  // legacy variables for backwards compatibility
  DB_NAME: z.string(),
  DB_READ_USER: z.string(),
  DB_READ_PASS: z.string(),
});

export const env = envSchema.parse(process.env);
