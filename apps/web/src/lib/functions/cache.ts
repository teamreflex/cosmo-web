import { clearTag, redis } from "@/lib/server/cache.server";
import { setCosmoKey } from "@/lib/server/encryption.server";
import { staffMiddleware } from "@/lib/server/middlewares";
import { cosmoKeySchema } from "@/lib/universal/schema/cosmo-key";
import { cosmoKeyCacheKey, pinCacheKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { ARTISTS_CACHE_KEY } from "./artists";
import { FILTER_DATA_CACHE_KEY } from "./core";

/**
 * Clear the cached artists + members payload.
 */
export const $clearArtistsCache = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .handler(async () => {
    await clearTag(ARTISTS_CACHE_KEY);
  });

/**
 * Clear the cached filter data (collections, seasons, classes).
 */
export const $clearFilterDataCache = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .handler(async () => {
    await clearTag(FILTER_DATA_CACHE_KEY);
  });

/**
 * Clear the cached pins for a specific COSMO user.
 */
export const $clearUserPinsCache = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .validator(z.object({ username: z.string() }))
  .handler(async ({ data }) => {
    await clearTag(pinCacheKey(data.username));
  });

/**
 * Report whether the COSMO encryption key is sourced from Redis or the env fallback.
 */
export const $getCosmoKeyStatus = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .handler(async () => {
    const cached = await redis.get(cosmoKeyCacheKey);
    return { source: cached !== null ? ("redis" as const) : ("env" as const) };
  });

/**
 * Update the COSMO encryption key in Redis.
 */
export const $setCosmoKey = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .validator(cosmoKeySchema)
  .handler(async ({ data }) => {
    await setCosmoKey(data.key);
  });
