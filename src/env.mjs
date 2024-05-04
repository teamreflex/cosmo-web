import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    // ramper auth endpoint
    RAMPER_URL: z.string().url(),
    // used for signing cookies
    JWT_SECRET: z.string().min(1),
    // neon db
    DATABASE_URL: z.string().min(1),
    // indexer db http proxy
    INDEXER_PROXY_KEY: z.string().min(1),
    INDEXER_PROXY_URL: z.string().min(1),
  },
  client: {
    // ramper app id for cosmo
    NEXT_PUBLIC_COSMO_APP_ID: z.string().min(1),
    // alchemy api key
    NEXT_PUBLIC_ALCHEMY_KEY: z.string().min(1),
    // info for rebranding the app
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    // fathom analytics
    NEXT_PUBLIC_FATHOM_ID: z.string().min(1),
    NEXT_PUBLIC_FATHOM_URL: z.string().min(1),
    // simulate successful grid response
    NEXT_PUBLIC_SIMULATE_GRID: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_COSMO_APP_ID: process.env.NEXT_PUBLIC_COSMO_APP_ID,
    NEXT_PUBLIC_ALCHEMY_KEY: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_FATHOM_ID: process.env.NEXT_PUBLIC_FATHOM_ID,
    NEXT_PUBLIC_FATHOM_URL: process.env.NEXT_PUBLIC_FATHOM_URL,
    NEXT_PUBLIC_SIMULATE_GRID: process.env.NEXT_PUBLIC_SIMULATE_GRID,
  },
});
