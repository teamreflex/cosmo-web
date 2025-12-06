import { RedisClient } from "bun";
import { createServerOnlyFn } from "@tanstack/react-start";
import { env } from "@/lib/env/server";
import { recordTiming, timed } from "./timing";

export const redis = new RedisClient(env.REDIS_URL);

/**
 * Get an item from the cache, or store the default value.
 */
export const remember = createServerOnlyFn(
  async <T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
  ): Promise<T> => {
    key = key.toLowerCase();

    const cacheStart = performance.now();
    const cached = await redis.get(key);
    recordTiming(`cache-get:${key}`, performance.now() - cacheStart);

    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const fresh = await timed(`cache-miss:${key}`, callback);
    redis.setex(key, ttl, JSON.stringify(fresh));

    return fresh;
  },
);

/**
 * Clear a tag from the cache.
 */
export const clearTag = createServerOnlyFn(async (tag: string) => {
  await redis.del(tag);
});

type CacheHeaders = {
  cdn: number;
};

/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders({ cdn }: CacheHeaders) {
  return {
    "Cache-Control": `public, max-age=30, s-maxage=${cdn}, stale-while-revalidate=30`,
  };
}
