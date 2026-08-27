import { cosmoKeyCacheKey } from "@apollo/util-server";
import { Context, Effect, Layer, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import { Env } from "./env";
import { redisLayer } from "./redis";

export class CosmoKey extends Context.Service<CosmoKey>()("app/CosmoKey", {
  make: Effect.gen(function* () {
    const env = yield* Env;
    const redis = yield* Redis.Redis;

    /**
     * Returns the Redis-stored COSMO encryption key, or the env fallback when unset.
     */
    const get = Effect.gen(function* () {
      const cached = yield* redis.send<string | null>("GET", cosmoKeyCacheKey);
      return cached ?? Redacted.value(env.cosmoKey);
    });

    return { get };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide([Env.layer, redisLayer]),
  );
}
