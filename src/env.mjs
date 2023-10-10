import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    VERCEL_ENV: z.enum(["development", "production"]),
    RAMPER_ENDPOINT: z.string().url(),
    JWT_SECRET: z.string().min(1),
    KV_URL: z.string().url(),
    KV_REST_API_URL: z.string().url(),
    KV_REST_API_TOKEN: z.string().min(1),
    KV_REST_API_READ_ONLY_TOKEN: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_COSMO_APP_ID: z.string().min(1),
    NEXT_PUBLIC_ALCHEMY_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    NEXT_PUBLIC_APP_VERSION: z.string().min(1),
    NEXT_PUBLIC_SIMULATE_GRID: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_COSMO_APP_ID: process.env.NEXT_PUBLIC_COSMO_APP_ID,
    NEXT_PUBLIC_ALCHEMY_KEY: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_SIMULATE_GRID: process.env.NEXT_PUBLIC_SIMULATE_GRID,
  },
});
