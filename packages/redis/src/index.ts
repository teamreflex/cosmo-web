import { RedisClient } from "bun";
import { Effect, Layer } from "effect";
import { Redis } from "effect/unstable/persistence";

/**
 * Layer providing Effect's persistence `Redis` service, backed by a scoped
 * Bun RedisClient connected to the given URL.
 *
 * Usage: `import * as Redis from "@apollo/redis"` then
 * `Redis.make({ url: "redis://..." })`; access the service via `effect/unstable/persistence`.
 */
export function make(options: { url: string }) {
  return Layer.effect(
    Redis.Redis,
    Effect.gen(function* () {
      const client = yield* Effect.acquireRelease(
        Effect.sync(() => new RedisClient(options.url)),
        (client) => Effect.sync(() => client.close()),
      );

      return yield* Redis.make({
        send: (command, ...args) =>
          Effect.tryPromise({
            try: () => client.send(command, [...args]),
            catch: (cause) => new Redis.RedisError({ cause }),
          }),
      });
    }),
  );
}
