import { beforeAll, expect, test } from "bun:test";
import { Effect, Logger, Redacted } from "effect";
import {
  addTrade,
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
import { makeState } from "./memory-store";

let signer: Signer;
const tokens: Record<string, string> = {};
beforeAll(async () => {
  signer = await makeSigner();
  for (const user of ["alice", "bob", "mod"]) {
    tokens[user] = await mint(signer, { sub: user });
  }
});

const token = (user: string) => tokens[user] ?? "";

/**
 * A unique string sent through a whole conversation (sending, history,
 * live delivery, a report, staff reading and removing it, refusals, a body
 * that won't decrypt) appears only in the parties' and staff's own streams
 * and replies: never in a log line, a stored row, a notification or a
 * report row.
 */
test("a canary appears only where a reader asked for it", async () => {
  const CANARY = `canary-${crypto.randomUUID()}`;
  const logs: string[] = [];
  const capture = Logger.layer([
    Logger.map(Logger.formatJson, (line) => {
      logs.push(line);
    }),
  ]);

  const state = makeState();
  seed(state);
  const read: string[] = [];
  const keep = (body: Redacted.Redacted<string> | null) => {
    if (body !== null) {
      read.push(Redacted.value(body));
    }
  };

  await run(
    state,
    signer,
    Effect.gen(function* () {
      const alice = yield* client(token("alice"));
      const bob = yield* client(token("bob"));
      const mod = yield* client(token("mod"));

      const bobSees = yield* collect(bob.Join({ tradeId: TRADE }));
      const { messageId } = yield* alice.Send({
        tradeId: TRADE,
        body: Redacted.make(`pay me at ${CANARY}`),
      });
      for (const item of yield* bobSees.take(1)) {
        keep(item._tag === "Message" ? item.body : null);
      }

      const { reportId } = yield* bob.Report({
        messageId,
        reason: "off_platform_payment",
      });
      keep((yield* mod.ReportedMessage({ reportId })).body);
      const modSees = yield* collect(mod.Join({ tradeId: TRADE }));
      for (const item of yield* modSees.take(1)) {
        keep(item._tag === "Message" ? item.body : null);
      }

      // refusals carry no text
      addTrade(state, {
        id: TRADE,
        status: "completed",
        from: "alice",
        to: "bob",
      });
      expect(
        yield* outcome(
          alice.Send({ tradeId: TRADE, body: Redacted.make(CANARY) }),
        ),
      ).toBe("ChatReadOnly");
      addTrade(state, {
        id: TRADE,
        status: "accepted",
        from: "alice",
        to: "bob",
      });

      // a body that won't decrypt is logged by id only
      const row = state.rows.find((each) => each.id === messageId);
      if (row?.kind === "text" && row.body !== null) {
        row.body = row.body.slice(0, -1);
      }
      const rejoined = yield* collect(bob.Join({ tradeId: TRADE }));
      expect(yield* rejoined.take(1)).toMatchObject([{ body: null }]);

      yield* mod.Remove({ messageId });
    }),
    capture,
  );

  expect(read).toEqual([
    `pay me at ${CANARY}`,
    `pay me at ${CANARY}`,
    `pay me at ${CANARY}`,
  ]);
  expect(logs.some((line) => line.includes("chat message unreadable"))).toBe(
    true,
  );
  const stored = [
    ...logs,
    JSON.stringify(state.notifications),
    JSON.stringify(state.reports),
    JSON.stringify(state.audit),
    ...state.rows.map((row) =>
      row.kind === "text"
        ? new TextDecoder().decode(row.body ?? new Uint8Array())
        : JSON.stringify(row.event),
    ),
    ...[...state.copies.values()].map((copy) =>
      new TextDecoder().decode(copy.body),
    ),
  ];
  expect(stored.filter((text) => text.includes(CANARY))).toEqual([]);
});
