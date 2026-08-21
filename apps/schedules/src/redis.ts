import * as Redis from "@apollo/redis";
import { Effect, Layer, Redacted } from "effect";
import { Env } from "./env";

/**
 * Effect's persistence `Redis` service, connected via the Env-configured URL.
 */
export const redisLayer = Layer.unwrap(
  Effect.gen(function* () {
    const env = yield* Env;
    return Redis.make({ url: Redacted.value(env.redisUrl) });
  }),
).pipe(Layer.provide(Env.layer));
