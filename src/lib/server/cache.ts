import { env } from "@/env";
import { Redis } from "@upstash/redis";

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
  await redis.set(key, fresh, { ex: ttl });

  return fresh;
}

/**
 * Clear a tag from the cache.
 */
export async function clearTag(tag: string) {
  await redis.del(tag);
}
