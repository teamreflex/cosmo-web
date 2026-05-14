import { env } from "@/lib/env/server";
import { cosmoKeyCacheKey } from "@apollo/util-server";
import { redis } from "./cache.server";

/**
 * Returns the Redis-stored COSMO encryption key, or the env fallback when unset.
 */
export async function getCosmoKey(): Promise<string> {
  const cached = await redis.get(cosmoKeyCacheKey);
  return cached ?? env.COSMO_KEY;
}

/**
 * Persists a new COSMO encryption key into Redis. No TTL; rotation is operator-driven.
 */
export async function setCosmoKey(key: string): Promise<void> {
  await redis.set(cosmoKeyCacheKey, key);
}
