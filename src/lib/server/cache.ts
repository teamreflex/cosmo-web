import { Redis } from "@upstash/redis";
import { waitUntil } from "@vercel/functions";
import { env } from "@/lib/env/server";

export const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});

/**
 * Get an item from the cache, or store the default value.
 */
export async function remember<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>
): Promise<T> {
  key = key.toLowerCase();
  const cached = await redis.get<T>(key);

  if (cached !== null) {
    return cached;
  }

  const fresh = await callback();

  // return fresh data first, then set cache in the background
  waitUntil(redis.set(key, fresh, { ex: ttl }));

  return fresh;
}

/**
 * Clear a tag from the cache.
 */
export async function clearTag(tag: string) {
  await redis.del(tag);
}

type CacheHeaders = {
  vercel: number;
  cloudflare?: number;
};

/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders({ vercel, cloudflare = 60 }: CacheHeaders) {
  return {
    // vercel: cache for X seconds
    "Vercel-CDN-Cache-Control": `max-age=0, s-maxage=${vercel}, stale-while-revalidate=30`,
    // cloudflare: cache for 60 seconds
    "CDN-Cache-Control": `max-age=0, s-maxage=${cloudflare}`,
    // browser: cache for 30 seconds
    "Cache-Control": "max-age=30",
  };
}
