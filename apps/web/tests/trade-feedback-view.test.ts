import type { TradeItemState, TradeState } from "@apollo/trades/lifecycle";
import { describe, expect, test } from "bun:test";
import {
  tradeFeedbackView,
  type VisibleFeedbackRow,
} from "../src/lib/universal/feedback";

const DAY = 24 * 60 * 60 * 1000;
const endedAt = new Date("2026-10-01T12:00:00Z");
const at = (days: number) => new Date(endedAt.getTime() + days * DAY);

const sent = (sender: "from" | "to"): TradeItemState => ({
  kind: "objekt",
  sender,
  transferred: true,
});
const unsent = (sender: "from" | "to"): TradeItemState => ({
  kind: "objekt",
  sender,
  transferred: false,
});
const completed: TradeState = {
  status: "completed",
  items: [sent("from"), sent("to")],
};

function row(
  raterSide: "from" | "to",
  overrides: Partial<VisibleFeedbackRow> = {},
): VisibleFeedbackRow {
  return {
    id: `${raterSide}-rating`,
    raterSide,
    rating: "positive",
    comment: `${raterSide} says thanks`,
    communication: null,
    speed: null,
    createdAt: at(1),
    removedAt: null,
    ...overrides,
  };
}

// the party on "to" reading the trade, unless a test says otherwise
function view(input: Partial<Parameters<typeof tradeFeedbackView>[0]> = {}) {
  return tradeFeedbackView({
    state: completed,
    side: "to",
    endedAt,
    now: at(2),
    rows: [],
    counterpartExists: true,
    ...input,
  });
}

describe("tradeFeedbackView", () => {
  test("an ineligible trade says so", () => {
    expect(
      view({
        state: {
          status: "cancelled",
          cancelledBy: "from",
          items: [unsent("from"), unsent("to")],
        },
      }),
    ).toEqual({ state: "ineligible" });
    expect(
      view({ state: { status: "disputed", items: [sent("from")] } }),
    ).toEqual({ state: "ineligible" });
  });

  test("an unrated trade is open until 30 days after it ended", () => {
    expect(view()).toEqual({
      state: "open",
      ended: "completed",
      endedAt,
      closesAt: at(30),
      theirs: null,
    });
    expect(view({ now: at(30) })).toEqual({
      state: "closed",
      closedAt: at(30),
    });
  });

  test("a timed-out trade with nothing sent can be rated", () => {
    expect(
      view({
        state: {
          status: "timed_out",
          abandonedBy: ["from"],
          items: [unsent("from"), unsent("to")],
        },
      }),
    ).toMatchObject({ state: "open", ended: "timed_out" });
  });

  test("the other party's rating shows while the viewer can still rate", () => {
    expect(view({ rows: [row("from", { comment: null })] })).toMatchObject({
      state: "open",
      closesAt: at(30),
      theirs: { id: "from-rating", comment: null },
    });
  });

  test("an unrated trade whose counterparty is gone can't be rated", () => {
    expect(view({ counterpartExists: false })).toEqual({ state: "none" });
    expect(
      view({ counterpartExists: false, rows: [row("from")] }),
    ).toMatchObject({
      state: "shown",
      mine: null,
      theirs: { id: "from-rating" },
    });
  });

  test("the viewer's own rating shows straight away, alone or with theirs", () => {
    expect(view({ rows: [row("to")] })).toMatchObject({
      state: "shown",
      mine: { id: "to-rating", comment: "to says thanks" },
      theirs: null,
    });
    expect(
      view({ rows: [row("to"), row("from", { rating: "negative" })] }),
    ).toMatchObject({
      state: "shown",
      mine: { id: "to-rating" },
      theirs: { id: "from-rating", rating: "negative" },
    });
  });

  test("the other party's rating still shows once the window closed", () => {
    expect(view({ now: at(31), rows: [row("from")] })).toMatchObject({
      state: "shown",
      mine: null,
      theirs: { id: "from-rating" },
    });
  });

  test("a removed rating is left out of theirs and flagged on mine", () => {
    expect(
      view({
        rows: [
          row("to", { removedAt: at(3) }),
          row("from", { removedAt: at(3) }),
        ],
      }),
    ).toMatchObject({ state: "shown", theirs: null, mine: { removed: true } });
    expect(
      view({ now: at(31), rows: [row("from", { removedAt: at(3) })] }),
    ).toEqual({ state: "closed", closedAt: at(30) });
  });
});
