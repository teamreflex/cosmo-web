import { beforeAll, describe, expect, test } from "bun:test";
import { Effect, Redacted, Stream } from "effect";
import { TestClock } from "effect/testing";
import { MessageCipher } from "../src/cipher";
import {
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
  test("notifies the other party, not the sender", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: text("hi") });
      }),
    );
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
