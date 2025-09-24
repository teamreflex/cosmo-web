import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // neon database
    DATABASE_URL: z.string().min(1),
    // indexer db http proxy
    INDEXER_PROXY_KEY: z.string().min(1),
    INDEXER_PROXY_URL: z.string().min(1),
    // sentry
    SENTRY_ORG: z.string().min(1),
    SENTRY_PROJECT: z.string().min(1),
    SENTRY_AUTH_TOKEN: z.string().min(1),
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
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.BUILD_ENV === "production",
});
