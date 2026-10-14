import { beforeAll, describe, expect, test } from "bun:test";
import { Effect, Redacted, Stream } from "effect";
import { TradeChannels } from "../src/channels";
import {
  client,
  collect,
  makeSigner,
  mint,
  outcome,
  run,
  seed,
  type Signer,
  TRADE,
} from "./harness";
import { makeState, type MemoryState } from "./memory-store";

let signer: Signer;
const tokens: Record<string, string> = {};
beforeAll(async () => {
  signer = await makeSigner();
  for (const user of ["alice", "bob", "carol", "mod", "admin"]) {
    tokens[user] = await mint(signer, { sub: user });
  }
});

const token = (user: string) => tokens[user] ?? "";

function world() {
  const state = makeState();
  seed(state);
  return state;
}

function openDispute(state: MemoryState) {
  state.reports.push({
    id: "dispute",
    reporterId: "alice",
    targetType: "trade",
    targetId: TRADE,
    status: "open",
    reason: "not_responding",
    note: null,
  });
}

describe("staff", () => {
  test("can't open a chat without an open report or dispute", async () => {
    await run(
      world(),
      signer,
      Effect.gen(function* () {
        const mod = yield* client(token("mod"));
        expect(
          yield* outcome(Stream.runHead(mod.Join({ tradeId: TRADE }))),
        ).toBe("StaffAccessRequired");
      }),
    );
  });

  test("read under an open dispute, and read-only", async () => {
    const state = world();
    openDispute(state);
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: Redacted.make("hi") });
        const mod = yield* client(token("mod"));
        const stream = yield* collect(mod.Join({ tradeId: TRADE }));
        expect(yield* stream.take(1)).toHaveLength(1);
        expect(
          yield* outcome(
            mod.Send({ tradeId: TRADE, body: Redacted.make("x") }),
          ),
        ).toBe("ChatReadOnly");
      }),
    );
  });

  test("a report on one of the trade's messages opens it too", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        const bob = yield* client(token("bob"));
        const { messageId } = yield* alice.Send({
          tradeId: TRADE,
          body: Redacted.make("hi"),
        });
        yield* bob.Report({ messageId, reason: "harassment" });
        const admin = yield* client(token("admin"));
        expect(
          yield* Stream.runHead(admin.Join({ tradeId: TRADE })),
        ).toBeDefined();
      }),
    );
  });

  test("access ends when the last open report closes", async () => {
    const state = world();
    openDispute(state);
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const channels = yield* TradeChannels;
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: Redacted.make("ready") });
        const mod = yield* client(token("mod"));
        const stream = yield* collect(mod.Join({ tradeId: TRADE }));
        // a delivered item means the stream is subscribed to the trade's signals
        yield* stream.take(1);
        for (const report of state.reports) {
          report.status = "resolved";
        }
        yield* channels.changed(TRADE);
        expect(yield* stream.failure).toMatchObject({
          _tag: "StaffAccessRequired",
        });
      }),
    );
  });

  test("Remove blanks the message, tells open streams and is audited", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        const bob = yield* client(token("bob"));
        const { messageId } = yield* alice.Send({
          tradeId: TRADE,
          body: Redacted.make("rude"),
        });
        const { reportId } = yield* bob.Report({
          messageId,
          reason: "harassment",
        });
        const bobSees = yield* collect(bob.Join({ tradeId: TRADE }));
        yield* bobSees.take(1);

        const mod = yield* client(token("mod"));
        expect(yield* outcome(bob.Remove({ messageId }))).toBe("Forbidden");
        yield* mod.Remove({ messageId });
        const [event] = yield* bobSees.take(1);
        expect(event).toMatchObject({
          _tag: "Event",
          event: { type: "message_removed", messageId },
        });

        const rejoined = yield* collect(bob.Join({ tradeId: TRADE }));
        const [message] = yield* rejoined.take(1);
        expect(message).toMatchObject({
          _tag: "Message",
          body: null,
          removed: true,
        });
        expect(state.audit).toContainEqual(
          expect.objectContaining({
            staffId: "mod",
            action: "trade:remove-message",
            targetId: String(messageId),
            reportId,
          }),
        );

        // the report's copy outlives the removal
        const copy = yield* mod.ReportedMessage({ reportId });
        expect(Redacted.value(copy.body)).toBe("rude");
        expect(copy.sender).toBe("from");
      }),
    );
  });

  test("only staff who read reports read a report's copy", async () => {
    await run(
      world(),
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        const bob = yield* client(token("bob"));
        const { messageId } = yield* alice.Send({
          tradeId: TRADE,
          body: Redacted.make("hi"),
        });
        const { reportId } = yield* bob.Report({ messageId, reason: "spam" });
        expect(yield* outcome(bob.ReportedMessage({ reportId }))).toBe(
          "Forbidden",
        );
        expect(yield* outcome(alice.ReportedMessage({ reportId }))).toBe(
          "Forbidden",
        );
      }),
    );
  });
});
