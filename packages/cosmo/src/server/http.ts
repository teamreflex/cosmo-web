import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "../types/common";

const apolloHeaders = {
  "User-Agent": "apollo.cafe (github.com/teamreflex/cosmo-web)",
};

/**
 * HTTP client for Cosmo.
 */
export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  retry: 2,
  retryDelay: 500, // 500ms
  timeout: 1000 * 10, // 10s
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
  retry: 2,
  retryDelay: 500, // 500ms
  timeout: 1000 * 10, // 10s
  headers: {
    ...apolloHeaders,
    ...cosmoShopHeaders,
  },
});
