import { env } from "@/lib/env/server";
import * as Redis from "@apollo/redis";
import { Layer, ManagedRuntime } from "effect";
import { RateLimiter } from "effect/unstable/persistence";

/**
 * Shared Effect runtime for server-side services.
 */
export const Runtime = ManagedRuntime.make(
  RateLimiter.layer.pipe(
    Layer.provide(RateLimiter.layerStoreRedis()),
    Layer.provide(Redis.make({ url: env.REDIS_URL })),
  ),
);
