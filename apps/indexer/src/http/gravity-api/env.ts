import { z } from "zod";
import { baseEnvSchema } from "../../env/base";

const envSchema = z
  .object({
    GRAVITY_HTTP_PORT: z.coerce.number().positive(),
    GRAVITY_CORS: z.string().min(1),
  })
  .merge(baseEnvSchema);

export const env = envSchema.parse(process.env);
