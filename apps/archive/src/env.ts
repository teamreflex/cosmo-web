import * as z from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().positive().default(4350),
  MODE: z.enum(["record", "replay"]).default("record"),
  UPSTREAM_URL: z.url(),
  DATA_DIR: z.string().default("./data"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  EXTERNAL_BASE_URL: z.url().optional(),
  RECORD_BODY_LIMIT_BYTES: z.coerce.number().positive().default(67108864),
});

export const env = envSchema.parse(process.env);
