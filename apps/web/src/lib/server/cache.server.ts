import { env } from "@/lib/env/server";
import { RedisClient } from "bun";

export const redis = new RedisClient(env.REDIS_URL);

/**
 * Get an item from the cache, or store the default value.
 * TTL is in seconds.
 */
export async function remember<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>,
): Promise<T> {
  key = key.toLowerCase();
  const cached = await redis.get(key);

  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  const fresh = await callback();
  await redis.setex(key, ttl, JSON.stringify(fresh));

  return fresh;
}

/**
 * Clear one or more tags from the cache in a single call.
 */
export async function clearTag(...tags: string[]) {
  if (tags.length === 0) return;
  await redis.del(...tags);
}

type CacheHeaders = {
  cdn: number;
  tags?: string | string[];
};

/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders(cache: CacheHeaders) {
  const tags = cache.tags
    ? Array.isArray(cache.tags)
      ? cache.tags
      : [cache.tags]
    : [];

  return {
    "Cache-Control": `public, max-age=30, s-maxage=${cache.cdn}, stale-while-revalidate=30`,
    ...(tags.length > 0 ? { "Cache-Tag": tags.join(",") } : {}),
  };
}
