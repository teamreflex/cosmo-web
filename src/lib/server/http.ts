import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "../universal/cosmo/common";
import { env } from "@/env.mjs";

/**
 * HTTP client for Cosmo.
 */
export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  retry: 3,
  retryDelay: 250, // 250ms
});

/**
 * HTTP client for Alchemy.
 */
export const alchemy = ofetch.create({
  baseURL: "https://polygon-mainnet.g.alchemy.com/v2",
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.NEXT_PUBLIC_ALCHEMY_KEY}`,
  },
  retry: 3,
  retryDelay: 250, // 100ms
});
