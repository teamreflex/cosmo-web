import type { TradeStatus } from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import {
  averageStars,
  type FeedbackOpening,
  feedbackDaysLeft,
  feedbackOpening,
  feedbackRole,
  feedbackScored,
} from "../src/feedback";
import type { TradeItemState, TradeState } from "../src/lifecycle";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function objekt(sender: "from" | "to", transferred = false): TradeItemState {
  return { kind: "objekt", sender, transferred };
}

function payment(
  sender: "from" | "to",
  { markedPaid = false, confirmed = false } = {},
): TradeItemState {
  return { kind: "payment", sender, markedPaid, confirmed };
}

function trade(
  status: TradeStatus,
  items: readonly TradeItemState[],
): TradeState {
  switch (status) {
    case "cancelled":
      return { status, cancelledBy: "from", items };
    case "timed_out":
      return { status, abandonedBy: ["to"], items };
    default:
      return { status, items };
  }
}

const endedAt = new Date("2026-10-01T12:00:00Z");
const at = (offset: number) => new Date(endedAt.getTime() + offset);
const closesAt = at(30 * DAY);

// whether the trade can be rated a day after it ended, by a party whose counterparty still exists
function opening(state: TradeState) {
  return feedbackOpening({
    state,
    endedAt,
    now: at(DAY),
    counterpartExists: true,
  }).status;
}

describe("feedbackOpening eligibility", () => {
  test("a completed trade, even one staff completed with no transfer seen (ELIG-01)", () => {
    expect(
      opening(trade("completed", [objekt("from", true), objekt("to", true)])),
    ).toBe("open");
    expect(opening(trade("completed", [objekt("from"), objekt("to")]))).toBe(
      "open",
    );
  });

  test("a timed-out trade, even with nothing sent (ELIG-02)", () => {
    expect(opening(trade("timed_out", [objekt("from"), objekt("to")]))).toBe(
      "open",
    );
    expect(
      opening(trade("timed_out", [objekt("from", true), objekt("to")])),
    ).toBe("open");
  });

  test("a trade staff cancelled, even with nothing sent (ELIG-03)", () => {
    expect(
      opening({
        status: "cancelled",
        cancelledBy: "staff",
        items: [objekt("from"), objekt("to")],
      }),
    ).toBe("open");
  });

  test.each(["from", "to"] as const)(
    "not a trade the %s party cancelled before anything was sent (ELIG-04)",
    (cancelledBy) => {
      expect(
        opening({
          status: "cancelled",
          cancelledBy,
          items: [objekt("from"), objekt("to")],
        }),
      ).toBe("ineligible");
    },
  );

  test("not a disputed trade, whatever arrived (ELIG-05)", () => {
    expect(
      opening(
        trade("disputed", [
          objekt("from", true),
          payment("to", { markedPaid: true, confirmed: true }),
        ]),
      ),
    ).toBe("ineligible");
  });
});

describe("feedbackScored", () => {
  test("a completed trade's rating counts, even with no transfer seen (SCORED-01)", () => {
    expect(
      feedbackScored(trade("completed", [objekt("from"), objekt("to")])),
    ).toBe(true);
  });

  test("a rating counts once a token arrived (SCORED-02)", () => {
    expect(
      feedbackScored(trade("timed_out", [objekt("from", true), objekt("to")])),
    ).toBe(true);
    expect(
      feedbackScored({
        status: "cancelled",
        cancelledBy: "staff",
        items: [objekt("from"), objekt("to", true)],
      }),
    ).toBe(true);
  });

  test("a rating doesn't count when nothing changed hands (SCORED-03)", () => {
    expect(
      feedbackScored(trade("timed_out", [objekt("from"), objekt("to")])),
    ).toBe(false);
    expect(
      feedbackScored({
        status: "cancelled",
        cancelledBy: "staff",
        items: [objekt("from"), objekt("to")],
      }),
    ).toBe(false);
  });

  test("a confirmed payment counts and one only marked paid doesn't (SCORED-04)", () => {
    expect(
      feedbackScored(
        trade("timed_out", [
          objekt("from"),
          payment("to", { markedPaid: true, confirmed: true }),
        ]),
      ),
    ).toBe(true);
    expect(
      feedbackScored(
        trade("timed_out", [
          objekt("from"),
          payment("to", { markedPaid: true, confirmed: false }),
        ]),
      ),
    ).toBe(false);
  });
});

describe("feedback window", () => {
  const completed = trade("completed", [objekt("from"), objekt("to")]);
  const window = (now: Date, counterpartExists = true) =>
    feedbackOpening({ state: completed, endedAt, now, counterpartExists });

  test("closes exactly 30 days after the trade ended (WIN-02)", () => {
    const open = {
      status: "open",
      ended: "completed",
      endedAt,
      closesAt,
    } satisfies FeedbackOpening;
    expect(window(endedAt)).toEqual(open);
    expect(window(at(30 * DAY - 1))).toEqual(open);
    expect(window(at(30 * DAY))).toEqual({
      status: "closed",
      closedAt: closesAt,
    });
    expect(window(at(30 * DAY + 1))).toEqual({
      status: "closed",
      closedAt: closesAt,
    });
  });

  test("a counterparty whose account is gone can't be rated while it's open", () => {
    expect(window(at(DAY), false)).toEqual({ status: "counterpart_gone" });
    expect(window(at(30 * DAY), false)).toEqual({
      status: "closed",
      closedAt: closesAt,
    });
  });

  test.each([
    ["the moment it ended", 0, 30],
    ["a minute after it ended", MINUTE, 29],
    ["a day after it ended", DAY, 29],
    ["a day and a minute after it ended", DAY + MINUTE, 28],
    ["half a day before it closes", 29 * DAY + 12 * HOUR, 0],
    ["an hour before it closes", 29 * DAY + 23 * HOUR, 0],
    ["a day after it closed", 31 * DAY, 0],
  ])("counts whole days left %s (WIN-03)", (_, offset, days) => {
    expect(feedbackDaysLeft(closesAt, at(offset))).toBe(days);
  });
});

describe("feedback roles", () => {
  test("a swap has two traders (ROLE-01)", () => {
    const items = [objekt("from"), objekt("to")];
    expect(feedbackRole(items, "from")).toBe("trader");
    expect(feedbackRole(items, "to")).toBe("trader");
  });

  test.each(["from", "to"] as const)(
    "the payment's sender (%s) is the buyer (ROLE-02)",
    (sender) => {
      const items = [
        objekt(sender === "from" ? "to" : "from"),
        payment(sender),
      ];
      expect(feedbackRole(items, sender)).toBe("buyer");
      expect(feedbackRole(items, sender === "from" ? "to" : "from")).toBe(
        "seller",
      );
    },
  );
});

describe("averageStars", () => {
  test("shows an average only from 10 starred ratings (SCORE-18)", () => {
    expect(averageStars(9 * 5 - 1, 9)).toBeNull();
    expect(averageStars(10 * 5 - 1, 10)).toBe(4.9);
  });
});
