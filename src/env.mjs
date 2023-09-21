import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    VERCEL_ENV: z.enum(["development", "production"]),
    RAMPER_ENDPOINT: z.string().url(),
    JWT_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_COSMO_APP_ID: z.string().min(1),
    NEXT_PUBLIC_ALCHEMY_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_VERSION: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_COSMO_APP_ID: process.env.NEXT_PUBLIC_COSMO_APP_ID,
    NEXT_PUBLIC_ALCHEMY_KEY: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
});
