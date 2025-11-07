import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "../types/common";

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
