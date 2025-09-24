import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "../universal/cosmo/common";
import { env } from "@/lib/env/server";

/**
 * HTTP client for Cosmo.
 */
export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  retry: 2,
  retryDelay: 500, // 500ms
  timeout: 1000 * 10, // 10s
  headers: {
    "User-Agent": "apollo.cafe (github.com/teamreflex/cosmo-web)",
  },
});

/**
 * HTTP RPC client for Abstract via Alchemy.
 */
export const abstract = ofetch.create({
  baseURL: "https://abstract-mainnet.g.alchemy.com/v2",
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.ALCHEMY_KEY}`,
  },
  retry: 2,
  retryDelay: 500, // 500ms
});

/**
 * HTTP client for Browserless.
 */
export const browserless = ofetch.create({
  baseURL: env.BROWSERLESS_BASE_URL,
  query: {
    token: env.BROWSERLESS_API_KEY,
  },
  retry: false,
});
