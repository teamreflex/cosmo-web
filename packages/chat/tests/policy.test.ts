import type { Role } from "@apollo/auth";
import type { TradeStatus } from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
  canJoinChat,
  canRemoveMessage,
  canReportMessage,
  canSendChat,
  type ChatTrade,
  type ChatViewer,
} from "../src/policy";

const trade = (status: ChatTrade["status"]): ChatTrade => ({
  status,
  fromUserId: "from-user",
  toUserId: "to-user",
  viewerPinned: false,
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

describe("canJoinChat", () => {
  // either side of acceptance, an ended trade, and an offer that ended unaccepted
  for (const status of [
    "pending",
    "accepted",
    "completed",
    "declined",
  ] satisfies TradeStatus[]) {
    test(`${status}: parties ${joinable.has(status) ? "join" : "are refused"}`, () => {
      expect(outcome(canJoinChat(viewers.from, trade(status), null))).toEqual(
        joinable.has(status) ? { kind: "party", side: "from" } : "ChatNotFound",
      );
      expect(outcome(canJoinChat(viewers.to, trade(status), "report"))).toEqual(
        joinable.has(status) ? { kind: "party", side: "to" } : "ChatNotFound",
      );
    });
  }

  test("disputed: an outsider never joins, even with an open report", () => {
    expect(
      outcome(canJoinChat(viewers.outsider, trade("disputed"), "report")),
    ).toBe("ChatNotFound");
  });

  test("read-chat joins only under an open report or dispute", () => {
    expect(
      outcome(canJoinChat(viewers.moderator, trade("completed"), null)),
    ).toBe("StaffAccessRequired");
    expect(
      outcome(canJoinChat(viewers.moderator, trade("disputed"), "report")),
    ).toEqual({ kind: "staff", reportId: "report" });
  });

  test("read-chat-global joins under an open report, else only reads", () => {
    expect(
      outcome(canJoinChat(viewers.admin, trade("completed"), null)),
    ).toEqual({ kind: "reader" });
    expect(
      outcome(canJoinChat(viewers.admin, trade("disputed"), "report")),
    ).toEqual({ kind: "staff", reportId: "report" });
  });

  test("staff whose linked COSMO account is pinned on the trade never join", () => {
    const relinked: ChatTrade = { ...trade("disputed"), viewerPinned: true };
    expect(outcome(canJoinChat(viewers.admin, relinked, "report"))).toBe(
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
});

describe("canSendChat", () => {
  const party = { kind: "party", side: "to" } as const;
  const staff = { kind: "staff", reportId: "report" } as const;

  test("accepted: a party sends", () => {
    expect(outcome(canSendChat(viewers.to, party, trade("accepted")))).toEqual(
      party,
    );
  });

  test("completed: a party is read-only", () => {
    expect(outcome(canSendChat(viewers.to, party, trade("completed")))).toBe(
      "ChatReadOnly",
    );
  });

  test("completed: staff with trade:message send under the report", () => {
    expect(
      outcome(canSendChat(viewers.moderator, staff, trade("completed"))),
    ).toEqual(staff);
  });

  test("staff without trade:message are read-only", () => {
    const demoted = { userId: "mod", role: "user" } satisfies ChatViewer;
    expect(outcome(canSendChat(demoted, staff, trade("accepted")))).toBe(
      "ChatReadOnly",
    );
  });

  test("staff with no open report on the trade only read", () => {
    expect(
      outcome(
        canSendChat(viewers.moderator, { kind: "reader" }, trade("accepted")),
      ),
    ).toBe("StaffAccessRequired");
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
    ["anything, as a staff reader", { kind: "reader" }, "to"],
  ] as const)("refuses %s", (_label, access, sender) => {
    expect(outcome(canReportMessage(access, { sender }))).toBe("Forbidden");
  });
});

describe("canRemoveMessage", () => {
  const staff = { kind: "staff", reportId: "report" } as const;

  test.each([
    ["moderator", "report"],
    ["user", "Forbidden"],
  ] satisfies [Role, string][])("%s under an open report", (role, expected) => {
    expect(outcome(canRemoveMessage({ userId: "staff", role }, staff))).toBe(
      expected,
    );
  });

  test("staff with no open report on the trade can't remove", () => {
    expect(
      outcome(canRemoveMessage(viewers.moderator, { kind: "reader" })),
    ).toBe("StaffAccessRequired");
  });

  test("a staff member in their own trade can't remove as a party", () => {
    expect(
      outcome(
        canRemoveMessage(viewers.moderator, { kind: "party", side: "from" }),
      ),
    ).toBe("Forbidden");
  });
});
