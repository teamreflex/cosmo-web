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
  sessionOf,
  type Signer,
  TRADE,
} from "./harness";
import { makeState, type MemoryState } from "./memory-store";

let signer: Signer;
const tokens: Record<string, string> = {};
beforeAll(async () => {
  signer = await makeSigner();
  for (const user of ["alice", "bob", "mod", "admin"]) {
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
  test("read-chat ends when the last open report closes", async () => {
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

  test("read-chat-global keeps reading once the last open report closes, but stops writing", async () => {
    const state = world();
    openDispute(state);
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const channels = yield* TradeChannels;
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: Redacted.make("ready") });
        const admin = yield* client(token("admin"));
        const stream = yield* collect(admin.Join({ tradeId: TRADE }));
        yield* stream.take(1);
        for (const report of state.reports) {
          report.status = "resolved";
        }
        yield* channels.changed(TRADE);
        const { messageId } = yield* alice.Send({
          tradeId: TRADE,
          body: Redacted.make("still there?"),
        });
        const [message] = yield* stream.take(1);
        expect(message).toMatchObject({ _tag: "Message", id: messageId });
        expect(
          yield* outcome(
            admin.Send({ tradeId: TRADE, body: Redacted.make("hello") }),
          ),
        ).toBe("StaffAccessRequired");
        expect(yield* outcome(admin.Remove({ messageId }))).toBe(
          "StaffAccessRequired",
        );
        expect(state.audit).toEqual([]);
      }),
    );
  });

  test("with no report, read-chat-global reads and read-chat is refused", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: Redacted.make("hi") });
        const admin = yield* client(token("admin"));
        const [message] = yield* Stream.runCollect(
          admin.Join({ tradeId: TRADE }).pipe(Stream.take(1)),
        );
        expect(message).toMatchObject({ _tag: "Message", sender: "from" });
        const mod = yield* client(token("mod"));
        expect(
          yield* outcome(Stream.runDrain(mod.Join({ tradeId: TRADE }))),
        ).toBe("StaffAccessRequired");
      }),
    );
  });

  test("a demotion ends a staff read at its next check", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const channels = yield* TradeChannels;
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: Redacted.make("hi") });
        const admin = yield* client(token("admin"));
        const stream = yield* collect(admin.Join({ tradeId: TRADE }));
        yield* stream.take(1);
        // no user event: only the role read at the next check ends it
        const session = state.sessions.get(sessionOf("admin"));
        if (session !== undefined) {
          state.sessions.set(sessionOf("admin"), { ...session, role: "user" });
        }
        yield* channels.changed(TRADE);
        expect(yield* stream.failure).toMatchObject({ _tag: "ChatNotFound" });
      }),
    );
  });

  test("staff whose linked COSMO account is pinned on the trade can't join it", async () => {
    const state = world();
    openDispute(state);
    state.relinks.push({ tradeId: TRADE, userId: "admin" });
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const admin = yield* client(token("admin"));
        expect(
          yield* outcome(Stream.runDrain(admin.Join({ tradeId: TRADE }))),
        ).toBe("ChatNotFound");
        expect(
          yield* outcome(
            admin.Send({ tradeId: TRADE, body: Redacted.make("hello") }),
          ),
        ).toBe("ChatNotFound");
      }),
    );
  });

  test("Remove blanks the message and tells open streams", async () => {
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
        // the report's copy outlives the removal
        const copy = yield* mod.ReportedMessage({ reportId });
        expect(Redacted.value(copy.body)).toBe("rude");
        expect(copy.sender).toBe("from");
      }),
    );
  });

  test("staff acting from a report are audited under it, else the oldest", async () => {
    const state = world();
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        const bob = yield* client(token("bob"));
        const mod = yield* client(token("mod"));
        const first = yield* alice.Send({
          tradeId: TRADE,
          body: Redacted.make("rude"),
        });
        const second = yield* alice.Send({
          tradeId: TRADE,
          body: Redacted.make("ruder"),
        });
        const older = yield* bob.Report({
          messageId: first.messageId,
          reason: "harassment",
        });
        const newer = yield* bob.Report({
          messageId: second.messageId,
          reason: "harassment",
        });

        yield* mod.Remove({
          messageId: second.messageId,
          reportId: newer.reportId,
        });
        const fromReport = yield* mod.Send({
          tradeId: TRADE,
          body: Redacted.make("please stop"),
          reportId: newer.reportId,
        });
        const fromTrade = yield* mod.Send({
          tradeId: TRADE,
          body: Redacted.make("noted"),
        });
        expect(state.audit).toEqual([
          {
            staffId: "mod",
            action: "trade:remove-message",
            targetId: String(second.messageId),
            reportId: newer.reportId,
          },
          {
            staffId: "mod",
            action: "trade:message",
            targetId: String(fromReport.messageId),
            reportId: newer.reportId,
          },
          {
            staffId: "mod",
            action: "trade:message",
            targetId: String(fromTrade.messageId),
            reportId: older.reportId,
          },
        ]);
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
      }),
    );
  });
});

describe("staff messages", () => {
  test("write to both parties under an open dispute, named and audited", async () => {
    const state = world();
    openDispute(state);
    state.names.set("mod", "ModCosmo");
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const alice = yield* client(token("alice"));
        yield* alice.Send({ tradeId: TRADE, body: Redacted.make("hi") });
        const mod = yield* client(token("mod"));
        const { messageId } = yield* mod.Send({
          tradeId: TRADE,
          body: Redacted.make("staff here"),
        });

        const staff = { _tag: "Staff", name: "ModCosmo" };
        for (const viewer of ["alice", "bob", "mod"]) {
          const stream = yield* collect(
            (yield* client(token(viewer))).Join({ tradeId: TRADE }),
          );
          const [, message] = yield* stream.take(2);
          expect(message).toMatchObject({ id: messageId, sender: staff });
        }

        // Bob's unread message from Alice doesn't hide the staff one
        expect(state.notifications).toEqual([
          { userId: "bob", actorId: "alice", offerId: TRADE, readAt: null },
          { userId: "alice", actorId: "mod", offerId: TRADE, readAt: null },
          { userId: "bob", actorId: "mod", offerId: TRADE, readAt: null },
        ]);
        expect(state.audit).toEqual([
          {
            staffId: "mod",
            action: "trade:message",
            targetId: String(messageId),
            reportId: "dispute",
          },
        ]);
      }),
    );
  });

  test("a deleted staff account's message stays a staff message", async () => {
    const state = world();
    openDispute(state);
    state.names.set("mod", "ModCosmo");
    await run(
      state,
      signer,
      Effect.gen(function* () {
        const mod = yield* client(token("mod"));
        yield* mod.Send({ tradeId: TRADE, body: Redacted.make("hi") });
        // deleting the account sets sender_id null
        for (const row of state.rows) {
          if (row.kind === "text") {
            row.senderId = null;
          }
        }
        const bob = yield* client(token("bob"));
        const stream = yield* collect(bob.Join({ tradeId: TRADE }));
        expect(yield* stream.take(1)).toMatchObject([
          { sender: { _tag: "Staff", name: null } },
        ]);
      }),
    );
  });
});
