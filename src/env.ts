import { createEnv } from "@t3-oss/env-nextjs";
import { neonVercel } from "@t3-oss/env-core/presets-zod";
import * as z from "zod";

export const env = createEnv({
  server: {
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
    // alchemy api key
    ALCHEMY_KEY: z.string().min(1),
    // better auth
    BETTER_AUTH_SECRET: z.string().min(1),
    // discord oauth
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    // twitter oauth
    TWITTER_CLIENT_ID: z.string().min(1),
    TWITTER_CLIENT_SECRET: z.string().min(1),
    // aws ses
    MAIL_SES_REGION: z.string().min(1),
    MAIL_SES_FROM: z.string().min(1),
    MAIL_SES_ACCESS_KEY: z.string().min(1),
    MAIL_SES_SECRET_KEY: z.string().min(1),
    // browserless.io
    COSMO_RECAPTCHA_KEY: z.string().min(1),
    BROWSERLESS_API_KEY: z.string().min(1),
    BROWSERLESS_BASE_URL: z.string().min(1),
    // upstash redis
    KV_REST_API_URL: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),
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
    // sentry
    NEXT_PUBLIC_SENTRY_DSN: z.string().min(1),
    // typesense
    NEXT_PUBLIC_TYPESENSE_URL: z.string().min(1),
    NEXT_PUBLIC_TYPESENSE_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_UMAMI_ID: process.env.NEXT_PUBLIC_UMAMI_ID,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TYPESENSE_URL: process.env.NEXT_PUBLIC_TYPESENSE_URL,
    NEXT_PUBLIC_TYPESENSE_KEY: process.env.NEXT_PUBLIC_TYPESENSE_KEY,
  },
  extends: [neonVercel()],
});
