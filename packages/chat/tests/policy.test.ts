import type { Role } from "@apollo/auth";
import {
  endedTradeStatuses,
  liveTradeStatuses,
  type TradeStatus,
  tradeStatuses,
} from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
  canJoinChat,
  canRemoveMessage,
  canReportMessage,
  canSendChat,
  type ChatAccess,
  type ChatTrade,
  type ChatViewer,
} from "../src/policy";

const trade = (status: ChatTrade["status"]): ChatTrade => ({
  status,
  fromUserId: "from-user",
  toUserId: "to-user",
});

const viewers = {
  from: { userId: "from-user", role: "user" },
  to: { userId: "to-user", role: "user" },
  outsider: { userId: "someone", role: "user" },
  moderator: { userId: "mod", role: "moderator" },
  admin: { userId: "admin", role: "admin" },
} satisfies Record<string, ChatViewer>;

// a successful value, or the failure's tag
function outcome<A, E extends { _tag: string }>(effect: Effect.Effect<A, E>) {
  const exit = Effect.runSyncExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  const failure = exit.cause.reasons.find((reason) => reason._tag === "Fail");
  return failure?._tag === "Fail" ? failure.error._tag : "defect";
}

const joinable = new Set([
  "accepted",
  "disputed",
  "completed",
  "cancelled",
  "timed_out",
]);
const live = new Set(["accepted", "disputed"]);

describe("canJoinChat", () => {
  for (const status of tradeStatuses) {
    test(`${status}: parties ${joinable.has(status) ? "join" : "are refused"}`, () => {
      expect(outcome(canJoinChat(viewers.from, trade(status), null))).toEqual(
        joinable.has(status) ? { kind: "party", side: "from" } : "ChatNotFound",
      );
      expect(outcome(canJoinChat(viewers.to, trade(status), "report"))).toEqual(
        joinable.has(status) ? { kind: "party", side: "to" } : "ChatNotFound",
      );
    });

    test(`${status}: an outsider never joins, even with an open report`, () => {
      expect(
        outcome(canJoinChat(viewers.outsider, trade(status), "report")),
      ).toBe("ChatNotFound");
    });

    test(`${status}: staff join only under an open report or dispute`, () => {
      for (const staff of [viewers.moderator, viewers.admin]) {
        expect(outcome(canJoinChat(staff, trade(status), null))).toBe(
          "StaffAccessRequired",
        );
        expect(outcome(canJoinChat(staff, trade(status), "report"))).toEqual({
          kind: "staff",
          reportId: "report",
        });
      }
    });
  }

  test("a deleted party's side matches no one", () => {
    const orphaned: ChatTrade = { ...trade("accepted"), toUserId: null };
    expect(outcome(canJoinChat(viewers.to, orphaned, null))).toBe(
      "ChatNotFound",
    );
  });

  test("a staff member who is a party joins as a party", () => {
    const own: ChatTrade = { ...trade("accepted"), fromUserId: "mod" };
    expect(outcome(canJoinChat(viewers.moderator, own, null))).toEqual({
      kind: "party",
      side: "from",
    });
  });

  test("a demoted moderator is an outsider", () => {
    const demoted = { userId: "mod", role: "user" } satisfies ChatViewer;
    expect(outcome(canJoinChat(demoted, trade("disputed"), "report"))).toBe(
      "ChatNotFound",
    );
  });
});

describe("canSendChat", () => {
  const party = { kind: "party", side: "to" } as const;
  const staff = { kind: "staff", reportId: "report" } as const;

  for (const status of tradeStatuses) {
    test(`${status}: a party ${live.has(status) ? "sends" : "is read-only"}`, () => {
      expect(outcome(canSendChat(viewers.to, party, trade(status)))).toEqual(
        live.has(status) ? party : "ChatReadOnly",
      );
    });
  }

  for (const status of tradeStatuses.filter((each) => joinable.has(each))) {
    test(`${status}: staff with trade:message send under the report`, () => {
      for (const viewer of [viewers.moderator, viewers.admin]) {
        expect(outcome(canSendChat(viewer, staff, trade(status)))).toEqual(
          staff,
        );
      }
    });
  }

  test("staff without trade:message are read-only", () => {
    const demoted = { userId: "mod", role: "user" } satisfies ChatViewer;
    expect(outcome(canSendChat(demoted, staff, trade("accepted")))).toBe(
      "ChatReadOnly",
    );
  });
});

describe("canReportMessage", () => {
  const staffSender = { _tag: "Staff", name: "moderator" } as const;

  test("a party reports the other party's message", () => {
    expect(
      outcome(
        canReportMessage({ kind: "party", side: "from" }, { sender: "to" }),
      ),
    ).toBe(undefined);
  });

  test.each([
    ["their own message", { kind: "party", side: "from" }, "from"],
    ["a deleted party's", { kind: "party", side: "from" }, null],
    ["a staff message", { kind: "party", side: "from" }, staffSender],
    ["anything, as staff", { kind: "staff", reportId: "report" }, "to"],
  ] as const)("refuses %s", (_label, access, sender) => {
    expect(outcome(canReportMessage(access, { sender }))).toBe("Forbidden");
  });
});

describe("canRemoveMessage", () => {
  const staff = { kind: "staff", reportId: "report" } as const;

  test.each([
    ["moderator", "report"],
    ["admin", "report"],
    ["user", "Forbidden"],
  ] satisfies [Role, string][])("%s under an open report", (role, expected) => {
    expect(outcome(canRemoveMessage({ userId: "staff", role }, staff))).toBe(
      expected,
    );
  });

  test("a staff member in their own trade can't remove as a party", () => {
    expect(
      outcome(
        canRemoveMessage(viewers.moderator, { kind: "party", side: "from" }),
      ),
    ).toBe("Forbidden");
  });
});

// UNIT-09
describe("direct offers", () => {
  test("the live and ended lists are exactly the accepted trade's statuses", () => {
    expect(liveTradeStatuses).toEqual(["accepted", "disputed"]);
    expect(endedTradeStatuses).toEqual(["completed", "cancelled", "timed_out"]);
  });

  test.each([
    ["pending", "ChatNotFound", "ChatReadOnly"],
    ["declined", "ChatNotFound", "ChatReadOnly"],
    ["withdrawn", "ChatNotFound", "ChatReadOnly"],
    ["countered", "ChatNotFound", "ChatReadOnly"],
    ["expired", "ChatNotFound", "ChatReadOnly"],
    ["stale", "ChatNotFound", "ChatReadOnly"],
    [
      "accepted",
      { kind: "party", side: "from" },
      { kind: "party", side: "from" },
    ],
    [
      "disputed",
      { kind: "party", side: "from" },
      { kind: "party", side: "from" },
    ],
    ["completed", { kind: "party", side: "from" }, "ChatReadOnly"],
    ["cancelled", { kind: "party", side: "from" }, "ChatReadOnly"],
    ["timed_out", { kind: "party", side: "from" }, "ChatReadOnly"],
  ] satisfies [TradeStatus, ChatAccess | string, ChatAccess | string][])(
    "%s: join gives %p and send gives %p",
    (status, join, send) => {
      expect(outcome(canJoinChat(viewers.from, trade(status), null))).toEqual(
        join,
      );
      expect(
        outcome(
          canSendChat(
            viewers.from,
            { kind: "party", side: "from" },
            trade(status),
          ),
        ),
      ).toEqual(send);
    },
  );
});
