import { RedisClient } from "bun";
import { Data, Effect, Redacted } from "effect";
import { Env } from "./env";

export class Redis extends Effect.Service<Redis>()("app/Redis", {
  effect: Effect.gen(function* () {
    const env = yield* Env;
    const client = new RedisClient(Redacted.value(env.redisUrl));

    /**
     * Delete tags from the cache.
     */
    const del = Effect.fn(function* (...tags: string[]) {
      yield* Effect.tryPromise({
        try: () => client.del(...tags),
        catch: (error) => new RedisDelError({ tags, cause: error }),
      });
    });

    /**
     * Get a value by key.
     */
    const get = Effect.fn(function* (key: string) {
      return yield* Effect.tryPromise({
        try: () => client.get(key),
        catch: (error) => new RedisGetError({ key, cause: error }),
      });
    });

    /**
     * Set a value by key.
     */
    const set = Effect.fn(function* (key: string, value: string) {
      yield* Effect.tryPromise({
        try: () => client.set(key, value),
        catch: (error) => new RedisSetError({ key, cause: error }),
      });
    });

    return {
      del,
      get,
      set,
    };
  }),
  dependencies: [Env.Default],
}) {}

export class RedisDelError extends Data.TaggedError("RedisDelError")<{
  tags: string[];
  cause: unknown;
}> {}

export class RedisGetError extends Data.TaggedError("RedisGetError")<{
  key: string;
  cause: unknown;
}> {}

export class RedisSetError extends Data.TaggedError("RedisSetError")<{
  key: string;
  cause: unknown;
}> {}
