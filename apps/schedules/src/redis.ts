import { keepConnectedLayer } from "@apollo/util-server/redis";
import { BunRedis } from "@effect/platform-bun";
import { Config } from "effect";

/**
 * Effect's persistence `Redis` service. Defined once so CosmoKey and the
 * scheduled tasks share a single client via layer memoization. The client
 * reconnects through any Redis outage.
 */
export const redisLayer = keepConnectedLayer(
  BunRedis.layerConfig({ url: Config.String("REDIS_URL") }),
);
