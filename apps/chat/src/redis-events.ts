import { USER_EVENTS_CHANNEL } from "@apollo/auth/events";
import { TRADE_EVENTS_CHANNEL } from "@apollo/trades/events";
import { Effect, Layer, Option, Schema, Stream } from "effect";
import { Redis } from "effect/persistence";
import { TradeChannels } from "./channels";
import { Disconnects } from "./disconnects";

const decodeTradeUpdate = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({ type: Schema.Literal("updated"), tradeId: Schema.String }),
  ),
);

// every user event ends the user's chat except an unban
const decodeUserEvent = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      type: Schema.Literals([
        "disconnect",
        "banned",
        "role-changed",
        "unbanned",
      ]),
      userId: Schema.String,
    }),
  ),
);

/**
 * Feeds Redis into chat: a `trade-events` update signals the trade's open
 * streams, and a `user-events` disconnect, ban or role change ends the
 * user's. A lost subscription resubscribes a second later and then signals
 * every open trade, so no message is missed; a disconnect published while it
 * was down is missed, and the token's lifetime bounds that.
 */
export const RedisEventsLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const redis = yield* Redis.Redis;
    const channels = yield* TradeChannels;
    const disconnects = yield* Disconnects;

    const follow = (
      channel: string,
      handle: (message: string) => Effect.Effect<unknown>,
    ) =>
      redis.subscribe(channel).pipe(
        Effect.tap(() => channels.changedAll),
        Effect.flatMap((queue) =>
          Stream.fromQueue(queue).pipe(
            Stream.runForEach((received) => handle(received.message)),
          ),
        ),
        Effect.scoped,
        Effect.catchCause(() =>
          Effect.logWarning("chat lost a redis subscription").pipe(
            Effect.annotateLogs({ channel }),
          ),
        ),
        Effect.andThen(Effect.sleep("1 second")),
        Effect.forever,
        Effect.forkScoped,
      );

    yield* follow(TRADE_EVENTS_CHANNEL, (message) =>
      Option.match(decodeTradeUpdate(message), {
        onNone: () => Effect.void,
        onSome: ({ tradeId }) => channels.changed(tradeId),
      }),
    );
    yield* follow(USER_EVENTS_CHANNEL, (message) =>
      Option.match(decodeUserEvent(message), {
        onNone: () => Effect.void,
        onSome: (event) =>
          event.type === "unbanned"
            ? Effect.void
            : disconnects.disconnect(event.userId),
      }),
    );
  }),
);
