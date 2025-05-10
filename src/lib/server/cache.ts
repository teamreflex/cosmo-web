import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { SecondaryStorage } from "better-auth";

/**
 * Upstash Redis client.
 */
export const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});

/**
 * Better Auth secondary storage implementation for Upstash/Redis.
 * @link https://www.better-auth.com/docs/concepts/database#secondary-storage
 */
export class RedisSessionCache implements SecondaryStorage {
  private prefix = "session:";
  private getKey(key: string) {
    return `${this.prefix}${key}`;
  }

  async get(key: string) {
    const value = await redis.get(this.getKey(key));
    if (!value) return null;
    return JSON.stringify(value);
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await redis.set(this.getKey(key), value, { ex: ttl });
    } else {
      await redis.set(this.getKey(key), value);
    }
  }

  async delete(key: string) {
    await redis.del(this.getKey(key));
  }
}
