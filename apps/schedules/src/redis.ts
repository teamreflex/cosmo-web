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
     * Set a value by key, optionally with a TTL (seconds) so a dead writer
     * can't pin the value indefinitely.
     */
    const set = Effect.fn(function* (
      key: string,
      value: string,
      ttlSeconds?: number,
    ) {
      yield* Effect.tryPromise({
        try: () =>
          ttlSeconds === undefined
            ? client.set(key, value)
            : client.set(key, value, "EX", ttlSeconds),
        catch: (error) => new RedisSetError({ key, cause: error }),
      });
    });

    /**
     * Set a TTL (seconds) on an existing key, refreshing it on each call.
     */
    const expire = Effect.fn(function* (key: string, ttlSeconds: number) {
      yield* Effect.tryPromise({
        try: () => client.expire(key, ttlSeconds),
        catch: (error) => new RedisSetError({ key, cause: error }),
      });
    });

    /**
     * Prepend a value to the head of a list.
     */
    const lpush = Effect.fn(function* (key: string, value: string) {
      yield* Effect.tryPromise({
        try: () => client.send("LPUSH", [key, value]),
        catch: (error) => new RedisListError({ key, cause: error }),
      });
    });

    /**
     * Trim a list to the inclusive [start, stop] index range.
     */
    const ltrim = Effect.fn(function* (
      key: string,
      start: number,
      stop: number,
    ) {
      yield* Effect.tryPromise({
        try: () => client.send("LTRIM", [key, String(start), String(stop)]),
        catch: (error) => new RedisListError({ key, cause: error }),
      });
    });

    /**
     * Read the values of a list over the inclusive [start, stop] index range.
     */
    const lrange = Effect.fn(function* (
      key: string,
      start: number,
      stop: number,
    ) {
      return yield* Effect.tryPromise({
        try: (): Promise<string[]> =>
          client.send("LRANGE", [key, String(start), String(stop)]),
        catch: (error) => new RedisListError({ key, cause: error }),
      });
    });

    return {
      del,
      get,
      set,
      expire,
      lpush,
      ltrim,
      lrange,
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

export class RedisListError extends Data.TaggedError("RedisListError")<{
  key: string;
  cause: unknown;
}> {}
