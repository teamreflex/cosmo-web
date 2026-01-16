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

    return {
      del,
    };
  }),
  dependencies: [Env.Default],
}) {}

export class RedisDelError extends Data.TaggedError("RedisDelError")<{
  tags: string[];
  cause: unknown;
}> {}
