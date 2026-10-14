import { USER_EVENTS_CHANNEL } from "@apollo/auth/events";
import {
  TRADE_EVENTS_CHANNEL,
  tradeUpdateMessage,
} from "@apollo/trades/events";
import { expect, test } from "bun:test";
import { Effect, Layer, Queue, Stream } from "effect";
import { Redis } from "effect/persistence";
import { TradeChannels } from "../src/channels";
import { Disconnects } from "../src/disconnects";
import { RedisEventsLive } from "../src/redis-events";

/**
 * Redis with pub/sub in memory: `publish` calls every subscriber of the
 * channel. Nothing else is used by chat's subscriber.
 */
function fakeRedis() {
  const subscribers = new Map<string, Set<(message: string) => void>>();
  const publish = (channel: string, message: string) => {
    for (const deliver of subscribers.get(channel) ?? []) {
      deliver(message);
    }
  };
  const layer = Layer.effect(
    Redis.Redis,
    Redis.make({
      send: () => Effect.die("unused"),
      subscribe: (channel, onMessage) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const deliver = (message: string) =>
              onMessage({ channel, message });
            const set = subscribers.get(channel) ?? new Set();
            set.add(deliver);
            subscribers.set(channel, set);
            return deliver;
          }),
          (deliver) =>
            Effect.sync(() => subscribers.get(channel)?.delete(deliver)),
        ).pipe(Effect.as(Effect.never)),
    }),
  );
  return { layer, publish };
}

const settle = Effect.promise(
  () => new Promise((resolve) => setTimeout(resolve, 5)),
);

test("trade updates signal the trade, and user events end the user's chat", async () => {
  const redis = fakeRedis();
  const world = RedisEventsLive.pipe(
    Layer.provideMerge(Layer.mergeAll(TradeChannels.layer, Disconnects.layer)),
    Layer.provide(redis.layer),
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      const channels = yield* TradeChannels;
      const disconnects = yield* Disconnects;
      const signals = yield* Queue.unbounded<string>();
      yield* channels.subscribe("trade-1").pipe(
        Effect.flatMap((subscription) =>
          Stream.fromSubscription(subscription).pipe(
            Stream.runForEach(() => Queue.offer(signals, "trade-1")),
          ),
        ),
        Effect.forkScoped,
      );
      const ended: string[] = [];
      for (const user of ["alice", "bob", "carol", "dave", "erin"]) {
        yield* disconnects.watch(user).pipe(
          Effect.flatMap((disconnected) => disconnected),
          Effect.andThen(Effect.sync(() => ended.push(user))),
          Effect.forkScoped,
        );
      }
      yield* settle;
      yield* Queue.clear(signals);

      redis.publish(TRADE_EVENTS_CHANNEL, tradeUpdateMessage("trade-1"));
      redis.publish(TRADE_EVENTS_CHANNEL, "not json");
      redis.publish(
        USER_EVENTS_CHANNEL,
        JSON.stringify({ type: "disconnect", userId: "alice" }),
      );
      redis.publish(
        USER_EVENTS_CHANNEL,
        JSON.stringify({ type: "banned", userId: "bob", expiresAt: null }),
      );
      redis.publish(
        USER_EVENTS_CHANNEL,
        JSON.stringify({ type: "role-changed", userId: "carol", role: "user" }),
      );
      redis.publish(
        USER_EVENTS_CHANNEL,
        JSON.stringify({ type: "unbanned", userId: "dave" }),
      );
      redis.publish(USER_EVENTS_CHANNEL, "{}");
      yield* settle;

      expect(yield* Queue.take(signals)).toBe("trade-1");
      expect(ended.toSorted()).toEqual(["alice", "bob", "carol"]);
    }).pipe(Effect.scoped, Effect.provide(world)),
  );
});
