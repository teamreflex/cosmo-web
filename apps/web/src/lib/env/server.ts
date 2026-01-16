import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    // postgres database
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url(),
    // indexer database
    INDEXER_DATABASE_URL: z.url(),
    // redis
    REDIS_URL: z.url(),
    // auth key
    AUTH_KEY: z.string().min(1),
    // abstract rpc endpoint
    ABSTRACT_RPC: z.url(),
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
    // browserless cdp
    COSMO_RECAPTCHA_KEY: z.string().min(1),
    CDP_ENDPOINT: z.string().min(1),
    // spotify api
    SPOTIFY_CLIENT_ID: z.string().min(1),
    SPOTIFY_CLIENT_SECRET: z.string().min(1),
    // cloudflare r2
    R2_ACCOUNT_ID: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_ACCESS_KEY: z.string().min(1),
    R2_SECRET_KEY: z.string().min(1),
    R2_DOMAIN: z.string().min(1),
    // sentry
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    INDEXER_DATABASE_URL: process.env.INDEXER_DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    AUTH_KEY: process.env.AUTH_KEY,
    ABSTRACT_RPC: process.env.ABSTRACT_RPC,
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
    CDP_ENDPOINT: process.env.CDP_ENDPOINT,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_ACCESS_KEY: process.env.R2_ACCESS_KEY,
    R2_SECRET_KEY: process.env.R2_SECRET_KEY,
    R2_DOMAIN: process.env.R2_DOMAIN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  },
  emptyStringAsUndefined: true,
});
