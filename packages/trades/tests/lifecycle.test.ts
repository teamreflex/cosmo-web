import {
  type ListingStatus,
  type TradeStatus,
  listingStatuses,
  tradeStatuses,
} from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import {
  type ListingEvent,
  type TradeEvent,
  type TradeItemState,
  type TradeState,
  owingSides,
  transition,
  transitionListing,
} from "../src/lifecycle";

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
      return { status, abandonedBy: ["from"], items };
    default:
      return { status, items };
  }
}

function statusAfter(state: TradeState, event: TradeEvent) {
  const result = transition(state, event);
  return result.ok ? result.trade.status : result.reason;
}

// a purchase: the seller (`from`) sends a token, the buyer (`to`) pays
const purchase = [objekt("from"), payment("to")];

/**
 * Each event with an acting side that may take it, the statuses it is
 * allowed from with `purchase`'s items, and where it goes.
 */
const allowed: [TradeEvent, TradeStatus[], TradeStatus | "unchanged"][] = [
  [{ type: "accept", by: "to" }, ["pending"], "accepted"],
  [{ type: "decline", by: "to" }, ["pending"], "declined"],
  [{ type: "counter", by: "to" }, ["pending"], "countered"],
  [{ type: "withdraw", by: "from" }, ["pending"], "withdrawn"],
  [{ type: "expire" }, ["pending"], "expired"],
  [{ type: "go_stale" }, ["pending"], "stale"],
  [{ type: "transfer", item: 0 }, ["accepted", "disputed"], "unchanged"],
  [{ type: "mark_paid", item: 1, by: "to" }, ["accepted"], "accepted"],
  [
    { type: "confirm_payment", item: 1, by: "from" },
    ["accepted", "disputed"],
    "unchanged",
  ],
  [{ type: "cancel", by: "from" }, ["accepted"], "cancelled"],
  [{ type: "dispute", by: "to" }, ["accepted"], "disputed"],
  [{ type: "time_out" }, ["accepted"], "timed_out"],
  [{ type: "staff_complete" }, ["disputed"], "completed"],
  [{ type: "staff_cancel" }, ["accepted", "disputed"], "cancelled"],
  [{ type: "staff_extend" }, ["disputed"], "accepted"],
];

describe("transition: every event from every status", () => {
  for (const [event, from, to] of allowed) {
    describe(event.type, () => {
      test.each([...tradeStatuses])("from %s", (status) => {
        const expected = from.includes(status)
          ? to === "unchanged"
            ? status
            : to
          : "wrong_status";
        expect(statusAfter(trade(status, purchase), event)).toBe(expected);
      });
    });
  }
});

describe("transition: parties", () => {
  test.each([
    [{ type: "accept", by: "from" }],
    [{ type: "decline", by: "from" }],
    [{ type: "counter", by: "from" }],
    [{ type: "withdraw", by: "to" }],
  ] satisfies [TradeEvent][])("refuses %o on a pending offer", (event) => {
    expect(statusAfter(trade("pending", purchase), event)).toBe("wrong_party");
  });

  test("only the payer marks paid, and only the receiver confirms", () => {
    const state = trade("accepted", purchase);
    expect(statusAfter(state, { type: "mark_paid", item: 1, by: "from" })).toBe(
      "wrong_party",
    );
    expect(
      statusAfter(state, { type: "confirm_payment", item: 1, by: "to" }),
    ).toBe("wrong_party");
  });

  test("either party may cancel or dispute", () => {
    const state = trade("accepted", purchase);
    for (const by of ["from", "to"] as const) {
      expect(transition(state, { type: "cancel", by })).toEqual({
        ok: true,
        trade: { status: "cancelled", cancelledBy: by, items: purchase },
      });
      expect(statusAfter(state, { type: "dispute", by })).toBe("disputed");
    }
  });

  test("staff cancelling is recorded as staff", () => {
    expect(
      transition(trade("disputed", purchase), { type: "staff_cancel" }),
    ).toEqual({
      ok: true,
      trade: { status: "cancelled", cancelledBy: "staff", items: purchase },
    });
  });
});

describe("transition: cancelling", () => {
  test.each([
    ["a token arrived", [objekt("from", true), payment("to")]],
    [
      "the buyer marked paid",
      [objekt("from"), payment("to", { markedPaid: true })],
    ],
    [
      "the seller confirmed",
      [objekt("from"), payment("to", { confirmed: true })],
    ],
  ])("is refused once %s", (_, items) => {
    for (const by of ["from", "to"] as const) {
      expect(
        statusAfter(trade("accepted", items), { type: "cancel", by }),
      ).toBe("already_started");
    }
  });

  test("a dispute is still possible once something started", () => {
    const items = [objekt("from", true), payment("to")];
    expect(
      statusAfter(trade("accepted", items), { type: "dispute", by: "to" }),
    ).toBe("disputed");
  });
});

describe("transition: items", () => {
  const swap = [objekt("from"), objekt("to"), objekt("to")];

  test("a swap completes when the last token arrives", () => {
    let state = trade("accepted", swap);
    for (const item of [0, 2]) {
      const result = transition(state, { type: "transfer", item });
      if (!result.ok) throw new Error(result.reason);
      state = result.trade;
      expect(state.status).toBe("accepted");
    }
    expect(transition(state, { type: "transfer", item: 1 })).toEqual({
      ok: true,
      trade: {
        status: "completed",
        items: [objekt("from", true), objekt("to", true), objekt("to", true)],
      },
    });
  });

  test("a purchase completes on the transfer and the confirmation, in either order", () => {
    const sent = trade("accepted", [objekt("from", true), payment("to")]);
    expect(
      statusAfter(sent, { type: "confirm_payment", item: 1, by: "from" }),
    ).toBe("completed");

    const confirmed = trade("accepted", [
      objekt("from"),
      payment("to", { confirmed: true }),
    ]);
    expect(statusAfter(confirmed, { type: "transfer", item: 0 })).toBe(
      "completed",
    );
  });

  test("marking paid never completes a purchase", () => {
    const state = trade("accepted", [objekt("from", true), payment("to")]);
    expect(statusAfter(state, { type: "mark_paid", item: 1, by: "to" })).toBe(
      "accepted",
    );
  });

  test("a disputed trade records the last token but stays disputed", () => {
    expect(
      transition(trade("disputed", [objekt("from", true), objekt("to")]), {
        type: "transfer",
        item: 1,
      }),
    ).toEqual({
      ok: true,
      trade: {
        status: "disputed",
        items: [objekt("from", true), objekt("to", true)],
      },
    });
  });

  test.each([
    ["an index past the end", { type: "transfer", item: 2 }],
    ["a payment as a token", { type: "transfer", item: 1 }],
    ["a token as a payment", { type: "mark_paid", item: 0, by: "to" }],
    [
      "a confirmation for a token",
      { type: "confirm_payment", item: 0, by: "to" },
    ],
  ] satisfies [string, TradeEvent][])("refuses %s", (_, event) => {
    expect(statusAfter(trade("accepted", purchase), event)).toBe(
      "no_such_item",
    );
  });

  test.each([
    [{ type: "transfer", item: 0 }],
    [{ type: "mark_paid", item: 1, by: "to" }],
    [{ type: "confirm_payment", item: 1, by: "from" }],
  ] satisfies [TradeEvent][])("refuses %o twice", (event) => {
    const done = trade("accepted", [
      objekt("from", true),
      payment("to", { markedPaid: true, confirmed: true }),
    ]);
    expect(statusAfter(done, event)).toBe("already_done");
  });

  test("leaves the given state untouched", () => {
    const items = [objekt("from"), objekt("to")];
    transition(trade("accepted", items), { type: "transfer", item: 0 });
    expect(items).toEqual([objekt("from"), objekt("to")]);
  });
});

describe("transition: timing out", () => {
  test("marks the side still owing tokens", () => {
    // B sent 3 of 6, @Kairu sent theirs
    const items = [
      objekt("from", true),
      ...[true, true, true, false, false, false].map((sent) =>
        objekt("to", sent),
      ),
    ];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", abandonedBy: ["to"], items },
    });
  });

  test("marks both sides when neither sent", () => {
    const items = [objekt("from"), objekt("to")];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", abandonedBy: ["from", "to"], items },
    });
  });

  test("marks a buyer who never marked paid", () => {
    const items = [objekt("from", true), payment("to")];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", abandonedBy: ["to"], items },
    });
  });

  test("completes when only the seller's confirmation is missing", () => {
    const items = [objekt("from", true), payment("to", { markedPaid: true })];
    expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
      "completed",
    );
  });

  test("never times out a disputed trade", () => {
    expect(statusAfter(trade("disputed", purchase), { type: "time_out" })).toBe(
      "wrong_status",
    );
  });
});

describe("owingSides", () => {
  test("lists sides in from, to order", () => {
    expect(owingSides([objekt("to"), objekt("from")])).toEqual(["from", "to"]);
    expect(owingSides([objekt("from", true), objekt("to", true)])).toEqual([]);
  });
});

/**
 * Each listing event and the statuses it leaves from.
 */
const listingAllowed: [ListingEvent, ListingStatus[], ListingStatus][] = [
  ["claim", ["open"], "claimed"],
  ["reopen", ["claimed"], "open"],
  ["fill", ["claimed"], "filled"],
  ["withdraw", ["open"], "withdrawn"],
  ["break", ["open", "claimed"], "broken"],
  ["remove", ["open"], "removed"],
  ["abandon", ["claimed"], "abandoned"],
];

describe("transitionListing: every event from every status", () => {
  for (const [event, from, to] of listingAllowed) {
    test.each([...listingStatuses])(`${event} from %s`, (status) => {
      expect(transitionListing(status, event)).toEqual(
        from.includes(status)
          ? { ok: true, status: to }
          : { ok: false, reason: "wrong_status" },
      );
    });
  }
});
