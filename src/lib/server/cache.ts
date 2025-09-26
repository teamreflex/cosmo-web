import { Redis } from "@upstash/redis";
import { waitUntil } from "@vercel/functions";
import { createServerOnlyFn } from "@tanstack/react-start";
import { env } from "@/lib/env/server";

export const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});

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
    const cached = await redis.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();

    // return fresh data first, then set cache in the background
    waitUntil(redis.set(key, fresh, { ex: ttl }));

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
  vercel: number;
};

/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders({ vercel }: CacheHeaders) {
  return new Headers([
    [
      "Vercel-CDN-Cache-Control",
      `max-age=0, s-maxage=${vercel}, stale-while-revalidate=30`,
    ],
    ["Cache-Control", "max-age=30"],
  ]);
}
