import { Context, Effect, Layer, Option, PubSub, RcMap } from "effect";

/**
 * One "this trade changed" signal per trade, for its open Join streams. A
 * signal carries nothing: each stream re-reads its own trade's rows past
 * the last id it sent, so signals can be coalesced or dropped without losing
 * a message, and a signal for the wrong trade only causes a harmless re-read.
 *
 * Each trade's PubSub lives in an RcMap while a stream holds it, and is
 * `sliding(1)`, so a publisher never waits and a slow stream skips straight
 * to the newest signal. Trades nobody has open cost nothing.
 */
export class TradeChannels extends Context.Service<TradeChannels>()(
  "chat/TradeChannels",
  {
    make: Effect.gen(function* () {
      const trades = yield* RcMap.make({
        lookup: (_tradeId: string) =>
          Effect.acquireRelease(PubSub.sliding<void>(1), PubSub.shutdown),
        idleTimeToLive: "30 seconds",
      });

      const changed = (tradeId: string) =>
        RcMap.getOption(trades, tradeId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.void,
              onSome: (pubsub) => PubSub.publish(pubsub, undefined),
            }),
          ),
          Effect.scoped,
          Effect.asVoid,
        );

      return {
        // the trade's signals until the caller's scope closes
        subscribe: (tradeId: string) =>
          RcMap.get(trades, tradeId).pipe(Effect.flatMap(PubSub.subscribe)),
        changed,
        // after Redis may have dropped messages, every open trade re-reads
        changedAll: RcMap.keys(trades).pipe(
          Effect.flatMap((keys) =>
            Effect.forEach(keys, changed, { discard: true }),
          ),
        ),
      };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make);
}
