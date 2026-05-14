import { cosmoKeyCacheKey } from "@apollo/util-server";
import { Effect, Redacted } from "effect";
import { Env } from "./env";
import { Redis } from "./redis";

export class CosmoKey extends Effect.Service<CosmoKey>()("app/CosmoKey", {
  effect: Effect.gen(function* () {
    const env = yield* Env;
    const redis = yield* Redis;

    /**
     * Returns the Redis-stored COSMO encryption key, or the env fallback when unset.
     */
    const get = Effect.gen(function* () {
      const cached = yield* redis.get(cosmoKeyCacheKey);
      return cached ?? Redacted.value(env.cosmoKey);
    });

    return { get };
  }),
  dependencies: [Env.Default, Redis.Default],
}) {}
