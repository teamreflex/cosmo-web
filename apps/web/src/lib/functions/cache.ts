import { clearTag } from "@/lib/server/cache.server";
import { adminMiddleware } from "@/lib/server/middlewares";
import { pinCacheKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { ARTISTS_CACHE_KEY } from "./artists";
import { FILTER_DATA_CACHE_KEY } from "./core";

/**
 * Clear the cached artists + members payload.
 */
export const $clearArtistsCache = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    await clearTag(ARTISTS_CACHE_KEY);
  });

/**
 * Clear the cached filter data (collections, seasons, classes).
 */
export const $clearFilterDataCache = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    await clearTag(FILTER_DATA_CACHE_KEY);
  });

/**
 * Clear the cached pins for a specific COSMO user.
 */
export const $clearUserPinsCache = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ username: z.string() }))
  .handler(async ({ data }) => {
    await clearTag(pinCacheKey(data.username));
  });
