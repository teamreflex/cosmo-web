import { beforeAll, describe, expect, test } from "bun:test";
import { Effect, Redacted, Stream } from "effect";
import { TestClock } from "effect/testing";
import { TradeChannels } from "../src/channels";
import { MessageCipher } from "../src/cipher";
import {
  addTrade,
  client,
  collect,
  makeSigner,
  mint,
  OTHER_TRADE,
  outcome,
  run,
  seed,
  settle,
  type Signer,
  TRADE,
} from "./harness";
import { makeState } from "./memory-store";

let signer: Signer;
const tokens: Record<string, string> = {};
beforeAll(async () => {
  signer = await makeSigner();
  for (const user of ["alice", "bob", "carol", "dave"]) {
    tokens[user] = await mint(signer, { sub: user });
  }
});

function world() {
  const state = makeState();
  seed(state);
  return state;
}

const token = (user: string) => tokens[user] ?? "";
const text = (value: string) => Redacted.make(value);

describe("Send", () => {
  test("stores ciphertext only, under the trade, and notifies the other party once", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        yield* alice.Send({
          tradeId: TRADE,
          body: text("plaintext-canary one"),
        });
        yield* alice.Send({
          tradeId: TRADE,
          body: text("plaintext-canary two"),
        });
      }),
    );
    expect(state.rows).toHaveLength(2);
    for (const row of state.rows) {
      expect(row.kind).toBe("text");
      if (row.kind === "text") {
        expect(row.senderId).toBe("alice");
        expect(
          new TextDecoder().decode(row.body ?? new Uint8Array()),
        ).not.toContain("canary");
      }
    }
    expect(state.notifications).toEqual([
      { userId: "bob", actorId: "alice", offerId: TRADE, readAt: null },
    ]);
  });

  test("a ciphertext moved to another trade fails to decrypt", async () => {
    await run(
      world(),
      signer,
      Effect.gen(function* () {
        const cipher = yield* MessageCipher;
        const bytes = yield* cipher.encrypt(TRADE, text("secret"));
        expect(Redacted.value(yield* cipher.decrypt(TRADE, bytes))).toBe(
          "secret",
        );
        expect(yield* outcome(cipher.decrypt(OTHER_TRADE, bytes))).toBe(
          "MessageUnreadable",
        );
        const tampered = bytes.slice();
        tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 1;
        expect(yield* outcome(cipher.decrypt(TRADE, tampered))).toBe(
          "MessageUnreadable",
        );
      }),
    );
  });

  test.each([
    ["accepted", "ok"],
    ["disputed", "ok"],
    ["completed", "ChatReadOnly"],
    ["cancelled", "ChatReadOnly"],
    ["timed_out", "ChatReadOnly"],
    ["pending", "ChatNotFound"],
    ["declined", "ChatNotFound"],
  ] as const)("a party sending on a %s trade: %s", async (status, expected) => {
    const state = world();
    addTrade(state, { id: TRADE, status, from: "alice", to: "bob" });
    const result = await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        return yield* outcome(alice.Send({ tradeId: TRADE, body: text("hi") }));
      }),
    );
    expect(result).toBe(expected);
  });

  test("an outsider can't send or join", async () => {
    await run(
      world(),
      signer,
      Effect.gen(function* () {
        const carol = yield* client(token("carol"));
        expect(
          yield* outcome(carol.Send({ tradeId: TRADE, body: text("hi") })),
        ).toBe("ChatNotFound");
        expect(
          yield* outcome(Stream.runHead(carol.Join({ tradeId: TRADE }))),
        ).toBe("ChatNotFound");
      }),
    );
  });

  test("ten sends per ten seconds, then RateLimited until the window passes", async () => {
    await run(
      world(),
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        for (let index = 0; index < 10; index++) {
          expect(
            yield* outcome(
              alice.Send({ tradeId: TRADE, body: text(`${index}`) }),
            ),
          ).toBe("ok");
        }
        expect(
          yield* outcome(alice.Send({ tradeId: TRADE, body: text("11") })),
        ).toBe("RateLimited");
        yield* TestClock.adjust("10 seconds");
        expect(
          yield* outcome(alice.Send({ tradeId: TRADE, body: text("12") })),
        ).toBe("ok");
      }),
    );
  });
});

describe("isolation", () => {
  test("two trades with concurrent senders never see each other's messages", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const [alice, bob, carol, dave] = yield* Effect.forEach(
          ["alice", "bob", "carol", "dave"],
          (user) => client(token(user)),
        );
        if (!alice || !bob || !carol || !dave) {
          return;
        }
        const bobSees = yield* collect(bob.Join({ tradeId: TRADE }));
        const daveSees = yield* collect(dave.Join({ tradeId: OTHER_TRADE }));
        yield* settle;
        yield* Effect.all(
          Array.from({ length: 5 }, (_, index) => [
            alice.Send({ tradeId: TRADE, body: text(`trade-a ${index}`) }),
            carol.Send({
              tradeId: OTHER_TRADE,
              body: text(`trade-b ${index}`),
            }),
          ]).flat(),
          { concurrency: "unbounded" },
        );
        const seenByBob = yield* bobSees.take(5);
        const seenByDave = yield* daveSees.take(5);
        yield* settle;
        expect([...(yield* bobSees.drain), ...(yield* daveSees.drain)]).toEqual(
          [],
        );

        const ids = (trade: string) =>
          state.rows
            .filter((row) => row.tradeId === trade)
            .map((row) => row.id);
        expect(
          seenByBob.map((item) => item.id).toSorted((a, b) => a - b),
        ).toEqual(ids(TRADE).toSorted((a, b) => a - b));
        expect(
          seenByDave.map((item) => item.id).toSorted((a, b) => a - b),
        ).toEqual(ids(OTHER_TRADE).toSorted((a, b) => a - b));
      }),
    );
  });

  test("a signal naming the wrong trade delivers nothing to it", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const channels = yield* TradeChannels;
        const alice = yield* client(token("alice"));
        const dave = yield* client(token("dave"));
        const daveSees = yield* collect(dave.Join({ tradeId: OTHER_TRADE }));
        yield* settle;
        yield* alice.Send({ tradeId: TRADE, body: text("for alice and bob") });
        yield* channels.changed(OTHER_TRADE);
        yield* settle;
        expect(yield* daveSees.drain).toEqual([]);
      }),
    );
  });

  test("a rejoin can't page another trade's ids with afterId", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        const carol = yield* client(token("carol"));
        const before = yield* carol.Send({
          tradeId: OTHER_TRADE,
          body: text("first"),
        });
        yield* alice.Send({ tradeId: TRADE, body: text("private") });
        const after = yield* carol.Send({
          tradeId: OTHER_TRADE,
          body: text("carol's"),
        });
        // a cursor below alice's message still reads only carol's own trade
        const stream = yield* collect(
          carol.Join({ tradeId: OTHER_TRADE, afterId: before.messageId }),
        );
        const [only] = yield* stream.take(1);
        yield* settle;
        expect(yield* stream.drain).toEqual([]);
        expect(only?.id).toBe(after.messageId);
      }),
    );
  });
});

describe("Report", () => {
  test.each([
    ["their own message", "alice", "Forbidden"],
    ["as an outsider", "carol", "MessageNotFound"],
  ])("refuses a report of %s", async (_label, reporter, expected) => {
    await run(
      world(),
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        const { messageId } = yield* alice.Send({
          tradeId: TRADE,
          body: text("hi"),
        });
        const chat = yield* client(token(reporter));
        expect(yield* outcome(chat.Report({ messageId, reason: "spam" }))).toBe(
          expected,
        );
      }),
    );
  });
});
