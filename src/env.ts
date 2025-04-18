import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    // ramper misc endpoint
    RAMPER_URL: z.string().url(),
    // ramper api endpoint
    RAMPER_API_URL: z.string().url(),
    // ramper app id for cosmo
    RAMPER_APP_ID: z.string().min(1),
    // user agent to use when making requests to ramper
    RAMPER_USERAGENT: z.string(),
    // used for signing cookies
    JWT_SECRET: z.string().min(1),
    // neon db
    DATABASE_URL: z.string().min(1),
    // indexer db http proxy
    INDEXER_PROXY_KEY: z.string().min(1),
    INDEXER_PROXY_URL: z.string().min(1),
    // sentry
    SENTRY_ORG: z.string().min(1),
    SENTRY_PROJECT: z.string().min(1),
    // auth key
    AUTH_KEY: z.string().min(1),
    // cron secret
    CRON_SECRET: z.string().min(1),
  },
  client: {
    // info for rebranding the app
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    // url of the app
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1),
    // environment type
    NEXT_PUBLIC_VERCEL_ENV: z.string().min(1),
    // umami analytics
    NEXT_PUBLIC_UMAMI_ID: z.string().min(1),
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: z.string().min(1),
    // simulate successful grid response
    NEXT_PUBLIC_SIMULATE_GRID: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true"),
    // alchemy api key
    NEXT_PUBLIC_ALCHEMY_KEY: z.string().min(1),
    // cosmo alchemy key
    NEXT_PUBLIC_COSMO_ALCHEMY_KEY: z.string().min(1),
    // ramper firebase
    NEXT_PUBLIC_RAMPER_FIREBASE_KEY: z.string().min(1),
    NEXT_PUBLIC_RAMPER_FIREBASE_ID: z.string().min(1),
    // sentry
    NEXT_PUBLIC_SENTRY_DSN: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_UMAMI_ID: process.env.NEXT_PUBLIC_UMAMI_ID,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
    NEXT_PUBLIC_SIMULATE_GRID: process.env.NEXT_PUBLIC_SIMULATE_GRID,
    NEXT_PUBLIC_ALCHEMY_KEY: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    NEXT_PUBLIC_COSMO_ALCHEMY_KEY: process.env.NEXT_PUBLIC_COSMO_ALCHEMY_KEY,
    NEXT_PUBLIC_RAMPER_FIREBASE_KEY:
      process.env.NEXT_PUBLIC_RAMPER_FIREBASE_KEY,
    NEXT_PUBLIC_RAMPER_FIREBASE_ID: process.env.NEXT_PUBLIC_RAMPER_FIREBASE_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
