import { env } from "@/lib/env/server";
import { TradeNotificationsQueue } from "@apollo/queue";
import { keepConnectedLayer } from "@apollo/util-server/redis";
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
  ).pipe(
    Layer.provide(keepConnectedLayer(BunRedis.layer({ url: env.REDIS_URL }))),
  ),
);
