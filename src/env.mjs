import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]),
    RAMPER_ENDPOINT: z.string().url(),
    COSMO_APP_ID: z.string().min(1),
    JWT_SECRET: z.string().min(1),
  },
  client: {},
  experimental__runtimeEnv: {},
});
