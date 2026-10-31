import { RateLimited } from "@apollo/chat/errors";
import { Context, Effect, Layer, Ref } from "effect";

// enough for a user with the trade open in several tabs and devices
export const MAX_OPEN_STREAMS = 10;

// a refused Join retries after this, by when one of the user's tabs may have closed
const RETRY_AFTER_MS = 30_000;

/**
 * How many Join streams each user has open. Every open stream re-reads the
 * database on each signal for its trade, so a user holding hundreds would
 * turn every message into hundreds of queries. Chat runs as one instance, so
 * this process's count is the whole count.
 */
export class OpenStreams extends Context.Service<OpenStreams>()(
  "chat/OpenStreams",
  {
    make: Effect.gen(function* () {
      const counts = yield* Ref.make(new Map<string, number>());

      const take = (userId: string) =>
        Ref.modify(counts, (current) => {
          const open = current.get(userId) ?? 0;
          return open >= MAX_OPEN_STREAMS
            ? [false, current]
            : [true, new Map(current).set(userId, open + 1)];
        });

      const release = (userId: string) =>
        Ref.update(counts, (current) => {
          const next = new Map(current);
          const open = (current.get(userId) ?? 1) - 1;
          if (open === 0) {
            next.delete(userId);
          } else {
            next.set(userId, open);
          }
          return next;
        });

      return {
        // one of the user's slots until the caller's scope closes, or RateLimited when they're all taken
        hold: (userId: string) =>
          Effect.acquireRelease(
            take(userId).pipe(
              Effect.flatMap((taken) =>
                taken
                  ? Effect.void
                  : Effect.fail(
                      new RateLimited({ retryAfterMs: RETRY_AFTER_MS }),
                    ),
              ),
            ),
            () => release(userId),
          ),
      };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make);
}
