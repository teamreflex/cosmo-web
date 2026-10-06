import { Effect, Layer } from "effect";

/**
 * A layer that runs a queue's take loop for as long as the app is up, the
 * way Effect's own `DurableQueue.worker` does:
 * - A failed job goes back to the queue, which retries it with backoff and
 *   moves it to the failed list after 10 attempts. The failure is logged and
 *   the loop takes the next job
 * - Waits a second after a failure, so an unreachable Redis doesn't spin
 * - One loop per queue: the web database client has a single connection, so
 *   more would only wait on each other
 */
export const createQueueWorker = <E, R>(
  name: string,
  take: Effect.Effect<void, E, R>,
) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      yield* Effect.logInfo(`Starting worker: ${name}`);
      yield* Effect.forkScoped(
        take.pipe(
          Effect.catchCause((cause) =>
            Effect.logError(`Worker ${name} failed`, cause).pipe(
              Effect.andThen(Effect.sleep("1 second")),
            ),
          ),
          Effect.forever,
        ),
      );
    }),
  );
