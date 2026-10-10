import { BunRedis } from "@effect/platform-bun";
import type { RedisClient } from "bun";
import { Effect, Layer } from "effect";

/**
 * Bun's client retries a dropped connection only until its `connectionTimeout`
 * runs out, whatever `maxRetries` says. After that it closes for good and
 * every command fails with "Connection has failed". `connect()` resets it, so
 * this calls it after each final close, backing off to 10 seconds, until Redis
 * is back. Returns a function that stops retrying before a deliberate close.
 */
export function keepConnected(client: RedisClient) {
  let attempts = 0;
  let stopped = false;
  let timer: Timer | undefined;

  client.onconnect = () => {
    attempts = 0;
  };
  client.onclose = () => {
    if (stopped) return;
    const delay = Math.min(1000 * 2 ** attempts++, 10_000);
    // a failed connect() runs onclose again, which schedules the next attempt
    timer = setTimeout(() => void client.connect().catch(() => {}), delay);
    timer.unref();
  };

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

/**
 * A `BunRedis` layer whose client reconnects through any Redis outage.
 */
export const keepConnectedLayer = <ROut, E, R>(
  redis: Layer.Layer<ROut, E, R>,
) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const { client } = yield* BunRedis.BunRedis;
      yield* Effect.acquireRelease(
        Effect.sync(() => keepConnected(client)),
        (stop) => Effect.sync(stop),
      );
    }),
  ).pipe(Layer.provideMerge(redis));
