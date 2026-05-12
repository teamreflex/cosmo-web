import { clearTag, redis } from "@/lib/server/cache.server";
import {
  COSMO_KEY_CACHE_KEY,
  setCosmoKey,
} from "@/lib/server/encryption.server";
import { adminMiddleware } from "@/lib/server/middlewares";
import { cosmoKeySchema } from "@/lib/universal/schema/cosmo-key";
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

/**
 * Report whether the COSMO encryption key is sourced from Redis or the env fallback.
 */
export const $getCosmoKeyStatus = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const cached = await redis.get(COSMO_KEY_CACHE_KEY);
    return { source: cached !== null ? ("redis" as const) : ("env" as const) };
  });

/**
 * Update the COSMO encryption key in Redis.
 */
export const $setCosmoKey = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(cosmoKeySchema)
  .handler(async ({ data }) => {
    await setCosmoKey(data.key);
  });
