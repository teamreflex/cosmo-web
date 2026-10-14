import { beforeAll, describe, expect, test } from "bun:test";
import { Effect, Option, Redacted, Stream } from "effect";
import { TestClock } from "effect/testing";
import { TradeChannels } from "../src/channels";
import { Disconnects } from "../src/disconnects";
import {
  client,
  collect,
  makeSigner,
  mint,
  run,
  seed,
  settle,
  type Signer,
  TRADE,
} from "./harness";
import { appendEvent, makeState } from "./memory-store";

let signer: Signer;
beforeAll(async () => {
  signer = await makeSigner();
});

function world() {
  const state = makeState();
  seed(state);
  return state;
}

const body = (item: { _tag: string; body?: unknown }) =>
  item._tag === "Message" && Redacted.isRedacted(item.body)
    ? Redacted.value(item.body)
    : null;

describe("Join", () => {
  test("streams the history, then live messages from either party", async () => {
    const state = world();
    const [alice, bob] = await Promise.all([
      mint(signer, { sub: "alice" }),
      mint(signer, { sub: "bob" }),
    ]);
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const a = yield* client(alice);
        const b = yield* client(bob);
        yield* a.Send({ tradeId: TRADE, body: Redacted.make("hello") });

        const stream = yield* collect(b.Join({ tradeId: TRADE }));
        const [first] = yield* stream.take(1);
        expect(first).toMatchObject({
          _tag: "Message",
          sender: "from",
          removed: false,
        });
        expect(first && body(first)).toBe("hello");

        yield* a.Send({ tradeId: TRADE, body: Redacted.make("second") });
        const [second] = yield* stream.take(1);
        expect(second && body(second)).toBe("second");
      }),
    );
  });

  test("says when the history is sent, even when there is none", async () => {
    const state = world();
    const alice = await mint(signer, { sub: "alice" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const a = yield* client(alice);
        expect(yield* Stream.runHead(a.Join({ tradeId: TRADE }))).toEqual(
          Option.some({ _tag: "CaughtUp" }),
        );

        yield* a.Send({ tradeId: TRADE, body: Redacted.make("hello") });
        const tags = yield* a
          .Join({ tradeId: TRADE })
          .pipe(Stream.take(2), Stream.runCollect);
        expect(tags.map((item) => item._tag)).toEqual(["Message", "CaughtUp"]);
      }),
    );
  });

  test("streams trade events between messages, in id order", async () => {
    const state = world();
    const alice = await mint(signer, { sub: "alice" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const a = yield* client(alice);
        const channels = yield* TradeChannels;
        yield* a.Send({ tradeId: TRADE, body: Redacted.make("one") });
        const stream = yield* collect(a.Join({ tradeId: TRADE }));
        yield* stream.take(1);

        appendEvent(state, TRADE, {
          type: "item_transferred",
          itemId: 1,
          hash: "0xabc",
        });
        yield* channels.changed(TRADE);
        const [event] = yield* stream.take(1);
        expect(event).toMatchObject({
          _tag: "Event",
          event: { type: "item_transferred", itemId: 1 },
        });
      }),
    );
  });

  test("a rejoin with afterId resumes with no gaps or duplicates", async () => {
    const state = world();
    const alice = await mint(signer, { sub: "alice" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const a = yield* client(alice);
        const ids: number[] = [];
        for (const text of ["1", "2", "3"]) {
          ids.push(
            (yield* a.Send({ tradeId: TRADE, body: Redacted.make(text) }))
              .messageId,
          );
        }
        const stream = yield* collect(
          a.Join({ tradeId: TRADE, afterId: ids[0] }),
        );
        const items = yield* stream.take(2);
        expect(items.map((item) => item.id)).toEqual(ids.slice(1));
        yield* settle;
        expect(yield* stream.drain).toEqual([]);
      }),
    );
  });

  test("ends with TokenExpired at the token's exp", async () => {
    const state = world();
    const alice = await mint(signer, { sub: "alice" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const a = yield* client(alice);
        yield* a.Send({ tradeId: TRADE, body: Redacted.make("ready") });
        const stream = yield* collect(a.Join({ tradeId: TRADE }));
        // a delivered item means the call is past ChatAuth and timing its expiry
        yield* stream.take(1);
        yield* TestClock.adjust("299 seconds");
        yield* settle;
        expect(stream.fiber.pollUnsafe()).toBeUndefined();
        yield* TestClock.adjust("1 second");
        expect(yield* stream.failure).toMatchObject({ _tag: "TokenExpired" });
      }),
    );
  });

  test("a disconnect ends every stream of that user and none of anyone else's", async () => {
    const state = world();
    const [alice, bob] = await Promise.all([
      mint(signer, { sub: "alice" }),
      mint(signer, { sub: "bob" }),
    ]);
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const disconnects = yield* Disconnects;
        const a = yield* client(alice);
        const b = yield* client(bob);
        yield* a.Send({ tradeId: TRADE, body: Redacted.make("ready") });
        const first = yield* collect(a.Join({ tradeId: TRADE }));
        const second = yield* collect(a.Join({ tradeId: TRADE }));
        const other = yield* collect(b.Join({ tradeId: TRADE }));
        // a delivered item means each call is past ChatAuth and watching disconnects
        for (const stream of [first, second, other]) {
          yield* stream.take(1);
        }

        yield* disconnects.disconnect("alice");
        expect(yield* first.failure).toMatchObject({ _tag: "SessionEnded" });
        expect(yield* second.failure).toMatchObject({ _tag: "SessionEnded" });
        yield* settle;
        expect(other.fiber.pollUnsafe()).toBeUndefined();

        yield* a.Send({ tradeId: TRADE, body: Redacted.make("still here") });
        const [item] = yield* other.take(1);
        expect(item && body(item)).toBe("still here");
      }),
    );
  });
});
