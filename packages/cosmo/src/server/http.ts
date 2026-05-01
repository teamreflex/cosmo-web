import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "../types/common";

const apolloHeaders = {
  "User-Agent": "apollo.cafe (github.com/teamreflex/cosmo-web)",
};

// exclude 499/aborted so client cancellations don't loop
const retryStatusCodes = [408, 425, 429, 500, 502, 503, 504];

/**
 * HTTP client for Cosmo.
 */
export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  retry: 1,
  retryDelay: 300,
  timeout: 10_000,
  retryStatusCodes,
  headers: apolloHeaders,
});

/**
 * Headers to use when interacting with the webshop.
 */
export const cosmoShopHeaders = {
  Host: "shop.cosmo.fans",
  Origin: "https://shop.cosmo.fans",
};

/**
 * HTTP client for Cosmo.
 */
export const cosmoShop = ofetch.create({
  baseURL: "https://shop.cosmo.fans",
  retry: 1,
  retryDelay: 300,
  timeout: 10_000,
  retryStatusCodes,
  headers: {
    ...apolloHeaders,
    ...cosmoShopHeaders,
  },
});
