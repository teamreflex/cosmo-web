# @apollo/redis

Layer factory for Effect's persistence `Redis` service (`effect/unstable/persistence`), backed by Bun's native `RedisClient`. The client is scoped to the layer: acquired on build, closed on teardown. Used by the web app's rate limiter store and the schedules app's cache access.

## Usage

```ts
import * as Redis from "@apollo/redis";
import { Effect, Layer } from "effect";
import { Redis as PersistenceRedis } from "effect/unstable/persistence";

const program = Effect.gen(function* () {
  const redis = yield* PersistenceRedis.Redis;

  const value = yield* redis.send<string | null>("GET", "some-key");
  yield* redis.send("DEL", "some-key", "another-key");
}).pipe(Effect.provide(Redis.make({ url: "redis://localhost:6379" })));
```

Commands fail with `RedisError` (defect cause from the underlying client). `send` performs no parsing — the type parameter is caller-asserted, and Redis-level type mismatches (e.g. `GET` on a hash) surface as `RedisError`, not decode failures. Parse at the call site when the shape matters.
