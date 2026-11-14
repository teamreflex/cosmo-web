import { beforeAll, describe, expect, test } from "bun:test";
import { Effect, Fiber, Option, Redacted, Stream } from "effect";
import { TestClock } from "effect/testing";
import { Disconnects } from "../src/disconnects";
import { PAGE } from "../src/handlers";
import { MAX_OPEN_STREAMS } from "../src/open-streams";
import {
  client,
  collect,
  makeSigner,
  mint,
  outcome,
  run,
  seed,
  settle,
  type Signer,
  TEST_NOW,
  TRADE,
} from "./harness";
import { makeState, type MemoryReport, type MemoryState } from "./memory-store";

let signer: Signer;
beforeAll(async () => {
  signer = await makeSigner();
});

function world() {
  const state = makeState();
  seed(state);
  return state;
}

// `count` timeline events on TRADE, as the web app writes them
function addEvents(state: MemoryState, count: number) {
  for (let index = 0; index < count; index++) {
    state.rows.push({
      kind: "event",
      id: state.nextId++,
      tradeId: TRADE,
      event: { type: "accepted" },
      createdAt: new Date(TEST_NOW),
    });
  }
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

  test.each([2 * PAGE, 2 * PAGE + 1])(
    "a history of %d rows arrives whole and in order before CaughtUp",
    async (count) => {
      const state = world();
      addEvents(state, count);
      const alice = await mint(signer, { sub: "alice" });
      await run(
        state,
        signer,
        Effect.gen(function* () {
          const a = yield* client(alice);
          const items = yield* a
            .Join({ tradeId: TRADE })
            .pipe(Stream.take(count + 1), Stream.runCollect);
          expect(
            items.map((item) => (item._tag === "CaughtUp" ? null : item.id)),
          ).toEqual([...state.rows.map((row) => row.id), null]);
        }),
      );
    },
  );

  test("reads the history a page at a time, as the client takes it", async () => {
    const state = world();
    addEvents(state, 3 * PAGE);
    const alice = await mint(signer, { sub: "alice" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const a = yield* client(alice);
        yield* Stream.runHead(a.Join({ tradeId: TRADE }));
        yield* settle;
        expect(state.pageReads).toBe(1);
      }),
    );
  });

  test("staff who lose access between pages get no later page", async () => {
    const state = world();
    addEvents(state, 2 * PAGE);
    const report: MemoryReport = {
      id: "dispute",
      reporterId: "alice",
      targetType: "trade",
      targetId: TRADE,
      status: "open",
      reason: "not_responding",
      note: null,
    };
    state.reports.push(report);
    const mod = await mint(signer, { sub: "mod" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const m = yield* client(mod);
        const ids: number[] = [];
        // the report closes while the first page is still being taken
        const ended = yield* outcome(
          m.Join({ tradeId: TRADE }).pipe(
            Stream.runForEach((item) =>
              Effect.sync(() => {
                report.status = "resolved";
                if (item._tag !== "CaughtUp") {
                  ids.push(item.id);
                }
              }),
            ),
          ),
        );
        expect(ended).toBe("StaffAccessRequired");
        expect(ids).toEqual(state.rows.slice(0, PAGE).map((row) => row.id));
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

  test("refuses a user's Join past the open-stream cap until one of theirs ends", async () => {
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
        yield* a.Send({ tradeId: TRADE, body: Redacted.make("ready") });

        const first = yield* collect(a.Join({ tradeId: TRADE }));
        const rest = yield* Effect.forEach(
          Array.from({ length: MAX_OPEN_STREAMS - 1 }),
          () => collect(a.Join({ tradeId: TRADE })),
        );
        // a delivered item means each stream holds its slot
        for (const stream of [first, ...rest]) {
          yield* stream.take(1);
        }

        const refused = yield* collect(a.Join({ tradeId: TRADE }));
        expect(yield* refused.failure).toMatchObject({ _tag: "RateLimited" });

        const other = yield* collect(b.Join({ tradeId: TRADE }));
        const [seen] = yield* other.take(1);
        expect(seen && body(seen)).toBe("ready");

        yield* Fiber.interrupt(first.fiber);
        yield* settle;
        const again = yield* collect(a.Join({ tradeId: TRADE }));
        const [item] = yield* again.take(1);
        expect(item && body(item)).toBe("ready");
      }),
    );
  });
});
