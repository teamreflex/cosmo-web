import { env } from "@/lib/env/server";
import { SaleNotificationsQueue, TradeNotificationsQueue } from "@apollo/queue";
import { BunRedis } from "@effect/platform-bun";
import { Layer, ManagedRuntime } from "effect";
import { RateLimiter } from "effect/unstable/persistence";

/**
 * Shared Effect runtime for server-side services.
 */
export const Runtime = ManagedRuntime.make(
  Layer.mergeAll(
    RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreRedis())),
    TradeNotificationsQueue.layer,
    SaleNotificationsQueue.layer,
  ).pipe(Layer.provide(BunRedis.layer({ url: env.REDIS_URL }))),
);
