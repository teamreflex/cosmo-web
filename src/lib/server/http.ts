import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "../universal/cosmo/common";
import { env } from "@/env";

/**
 * HTTP client for Cosmo.
 */
export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  retry: 2,
  retryDelay: 500, // 500ms
  timeout: 1000 * 10, // 10s
});

/**
 * HTTP client for Alchemy.
 */
export const alchemy = ofetch.create({
  baseURL: "https://abstract-mainnet.g.alchemy.com/v2",
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.NEXT_PUBLIC_ALCHEMY_KEY}`,
  },
  retry: 2,
  retryDelay: 500, // 500ms
});
