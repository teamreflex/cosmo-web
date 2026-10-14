import { Context, Effect, Layer, PubSub, Stream } from "effect";

/**
 * Users whose chat must end now: signed out, a session revoked, a password
 * changed, the account deleted, banned or re-roled. Every authenticated call
 * watches its user, so one disconnect ends all of their streams and none of
 * anyone else's; their client then rejoins and is refused if it must be.
 */
export class Disconnects extends Context.Service<Disconnects>()(
  "chat/Disconnects",
  {
    make: Effect.gen(function* () {
      const users = yield* PubSub.unbounded<string>();
      return {
        disconnect: (userId: string) => PubSub.publish(users, userId),
        /**
         * Subscribes now, in the caller's scope, and returns an effect that
         * completes once the user is disconnected, so nothing published
         * after this call is missed.
         */
        watch: (userId: string) =>
          PubSub.subscribe(users).pipe(
            Effect.map((subscription) =>
              Stream.fromSubscription(subscription).pipe(
                Stream.filter((id) => id === userId),
                Stream.runHead,
                Effect.asVoid,
              ),
            ),
          ),
      };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make);
}
