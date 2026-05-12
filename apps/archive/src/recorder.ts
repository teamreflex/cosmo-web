import { Data, Effect, Queue } from "effect";
import { Database } from "./db";
import { interactions } from "./schema";
import type { InteractionInsert } from "./types";

export class RecorderError extends Data.TaggedError("RecorderError")<{
  cause: unknown;
}> {}

export class Recorder extends Effect.Service<Recorder>()("app/Recorder", {
  scoped: Effect.gen(function* () {
    const db = yield* Database;
    const queue = yield* Queue.unbounded<InteractionInsert>();

    // single drainer fiber: serializes inserts, survives across the server's lifetime
    yield* Effect.forkScoped(
      Effect.gen(function* () {
        while (true) {
          const entry = yield* Queue.take(queue);
          yield* Effect.tryPromise({
            try: () => db.insert(interactions).values(entry),
            catch: (cause) => new RecorderError({ cause }),
          }).pipe(
            Effect.catchAll((err) =>
              Effect.logError(`recorder insert failed for ${entry.id}`, err),
            ),
          );
        }
      }),
    );

    // graceful shutdown: drain queue before scope finalization
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        const remaining = yield* Queue.size(queue);
        if (remaining > 0) {
          yield* Effect.logInfo(`flushing ${remaining} pending records`);
        }
        yield* Queue.shutdown(queue);
      }),
    );

    return {
      offer: (entry: InteractionInsert) => Queue.offer(queue, entry),
    };
  }),
  dependencies: [Database.Default],
}) {}
