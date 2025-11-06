import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // postgres database
    DATABASE_URL: z.url(),
    // indexer database
    INDEXER_DATABASE_URL: z.url(),
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
    REDIS_URL: z.string().min(1),
    REDIS_PASSWORD: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    INDEXER_DATABASE_URL: process.env.INDEXER_DATABASE_URL,
    AUTH_KEY: process.env.AUTH_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    ALCHEMY_KEY: process.env.ALCHEMY_KEY,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
    MAIL_SES_REGION: process.env.MAIL_SES_REGION,
    MAIL_SES_FROM: process.env.MAIL_SES_FROM,
    MAIL_SES_ACCESS_KEY: process.env.MAIL_SES_ACCESS_KEY,
    MAIL_SES_SECRET_KEY: process.env.MAIL_SES_SECRET_KEY,
    COSMO_RECAPTCHA_KEY: process.env.COSMO_RECAPTCHA_KEY,
    BROWSERLESS_API_KEY: process.env.BROWSERLESS_API_KEY,
    BROWSERLESS_BASE_URL: process.env.BROWSERLESS_BASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  },
  emptyStringAsUndefined: true,
});
