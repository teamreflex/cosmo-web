import { z } from "zod";
import { baseEnvSchema } from "../../env/base";

const envSchema = z
  .object({
    PROXY_HTTP_PORT: z.coerce.number().positive(),
    PROXY_KEY: z.string().min(1),
    PROXY_CACHE_MAX_AGE: z.coerce.number().positive().default(60),
  })
  .merge(baseEnvSchema);

export const env = envSchema.parse(process.env);
