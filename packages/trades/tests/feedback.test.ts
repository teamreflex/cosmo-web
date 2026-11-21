import type { TradeStatus } from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import {
  feedbackDaysLeft,
  type FeedbackOpening,
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

function trade(
  status: Exclude<TradeStatus, "pending" | "cancelled">,
  items: readonly TradeItemState[],
): TradeState {
  return { status, items };
}

const endedAt = new Date("2026-10-01T12:00:00Z");
const at = (offset: number) => new Date(endedAt.getTime() + offset);
const closesAt = at(14 * DAY);

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
  test("not a timed-out trade, where neither side sent anything (ELIG-02)", () => {
    expect(opening(trade("timed_out", [objekt("from"), objekt("to")]))).toBe(
      "ineligible",
    );
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

  test("not a trade the from party cancelled before anything was sent (ELIG-04)", () => {
    expect(
      opening({
        status: "cancelled",
        cancelledBy: "from",
        items: [objekt("from"), objekt("to")],
      }),
    ).toBe("ineligible");
  });

  test("not a disputed trade, whatever arrived (ELIG-05)", () => {
    expect(
      opening(trade("disputed", [objekt("from", true), objekt("to", true)])),
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
      feedbackScored({
        status: "cancelled",
        cancelledBy: "staff",
        items: [objekt("from"), objekt("to", true)],
      }),
    ).toBe(true);
  });

  test("a rating counts once a payment was confirmed", () => {
    expect(
      feedbackScored({
        status: "cancelled",
        cancelledBy: "staff",
        items: [
          objekt("from"),
          { kind: "payment", sender: "to", stage: "confirmed" },
        ],
      }),
    ).toBe(true);
  });

  test("a rating doesn't count when nothing changed hands (SCORED-03)", () => {
    expect(
      feedbackScored({
        status: "cancelled",
        cancelledBy: "staff",
        items: [objekt("from"), objekt("to")],
      }),
    ).toBe(false);
  });
});

describe("feedback window", () => {
  const completed = trade("completed", [objekt("from"), objekt("to")]);
  const window = (now: Date, counterpartExists = true) =>
    feedbackOpening({ state: completed, endedAt, now, counterpartExists });

  test("closes exactly 14 days after the trade ended (WIN-02)", () => {
    const open = {
      status: "open",
      ended: "completed",
      endedAt,
      closesAt,
    } satisfies FeedbackOpening;
    expect(window(at(14 * DAY - 1))).toEqual(open);
    expect(window(at(14 * DAY))).toEqual({
      status: "closed",
      closedAt: closesAt,
    });
    expect(window(at(14 * DAY + 1))).toEqual({
      status: "closed",
      closedAt: closesAt,
    });
  });

  test("a counterparty whose account is gone can't be rated while it's open", () => {
    expect(window(at(DAY), false)).toEqual({ status: "counterpart_gone" });
    expect(window(at(14 * DAY), false)).toEqual({
      status: "closed",
      closedAt: closesAt,
    });
  });

  test.each([
    ["the moment it ended", 0, 14],
    ["a minute after it ended", MINUTE, 13],
    ["a day after it closed", 15 * DAY, 0],
  ])("counts whole days left %s (WIN-03)", (_, offset, days) => {
    expect(feedbackDaysLeft(closesAt, at(offset))).toBe(days);
  });
});

describe("feedback roles", () => {
  test("a swap has two traders (ROLE-01)", () => {
    expect(feedbackRole([objekt("from"), objekt("to")], "from")).toBe("trader");
  });

  test("a sale: the side sending only the payment is the buyer", () => {
    const items: TradeItemState[] = [
      objekt("from"),
      { kind: "payment", sender: "to", stage: "unpaid" },
    ];
    expect(feedbackRole(items, "from")).toBe("seller");
    expect(feedbackRole(items, "to")).toBe("buyer");
  });

  test("a buy listing's trade: the poster paying is the buyer", () => {
    const items: TradeItemState[] = [
      objekt("to"),
      objekt("to"),
      { kind: "payment", sender: "from", stage: "unpaid" },
    ];
    expect(feedbackRole(items, "from")).toBe("buyer");
    expect(feedbackRole(items, "to")).toBe("seller");
  });

  test.each([
    ["the claimer's payment beside their objekt", "to"],
    ["the poster's payment on top of theirs", "from"],
  ] as const)("%s: both are traders", (_, sender) => {
    const items: TradeItemState[] = [
      objekt("from"),
      objekt("to"),
      { kind: "payment", sender, stage: "unpaid" },
    ];
    expect(feedbackRole(items, "from")).toBe("trader");
    expect(feedbackRole(items, "to")).toBe("trader");
  });
});
