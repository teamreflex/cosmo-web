import {
  type ListingStatus,
  type TradeSide,
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
  listingEventAfter,
  listingTransition,
  needsYou,
  owingSides,
  partyAction,
  tradeState,
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

// a 1-for-6 shaped swap: the poster sends 3, the claimer sends 3
const sixObjekts = (transferred = false) => [
  objekt("from", transferred),
  objekt("from", transferred),
  objekt("from", transferred),
  objekt("to", transferred),
  objekt("to", transferred),
  objekt("to", transferred),
];

function apply(state: TradeState, event: TradeEvent) {
  const result = transition(state, event);
  if (!result.ok) throw new Error(result.reason);
  return result.trade;
}

/**
 * Each event with an acting side that may take it, the statuses it is
 * allowed from with `purchase`'s items, and where it goes. Every status not
 * listed refuses with wrong_status (LIFE-03, LIFE-06, LIFE-13, LIFE-14,
 * LIFE-16, LIFE-17).
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
  [{ type: "cancel", by: "to" }, ["accepted"], "cancelled"],
  [{ type: "dispute", by: "from" }, ["accepted"], "disputed"],
  [{ type: "dispute", by: "to" }, ["accepted"], "disputed"],
  [{ type: "dispute", by: "staff" }, ["accepted"], "disputed"],
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

  test("either party may cancel or dispute (LIFE-04, UNIT-01)", () => {
    for (const items of [purchase, sixObjekts()]) {
      const state = trade("accepted", items);
      for (const by of ["from", "to"] as const) {
        expect(transition(state, { type: "cancel", by })).toEqual({
          ok: true,
          trade: { status: "cancelled", cancelledBy: by, items },
        });
        expect(statusAfter(state, { type: "dispute", by })).toBe("disputed");
      }
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

  test("staff cancel leaves no abandoned marks once items were sent (LIFE-15)", () => {
    const items = [objekt("from", true), objekt("to")];
    for (const status of ["accepted", "disputed"] as const) {
      expect(
        transition(trade(status, items), { type: "staff_cancel" }),
      ).toEqual({
        ok: true,
        trade: { status: "cancelled", cancelledBy: "staff", items },
      });
    }
  });

  test("a ban disputes an accepted trade as staff, leaving its items (LIFE-01)", () => {
    const items = [objekt("from"), objekt("to")];
    expect(
      transition(trade("accepted", items), { type: "dispute", by: "staff" }),
    ).toEqual({ ok: true, trade: { status: "disputed", items } });
  });

  test("a ban skips a trade that is already disputed (LIFE-03)", () => {
    expect(
      transition(trade("disputed", purchase), { type: "dispute", by: "staff" }),
    ).toEqual({ ok: false, reason: "wrong_status" });
  });
});

describe("transition: cancelling", () => {
  test.each([
    ["a token arrived", [objekt("from", true), payment("to")]],
    ["the claimer's token arrived", [objekt("from"), objekt("to", true)]],
    [
      "the buyer marked paid",
      [objekt("from"), payment("to", { markedPaid: true })],
    ],
    [
      "the seller confirmed",
      [objekt("from"), payment("to", { confirmed: true })],
    ],
  ])("is refused once %s (LIFE-05, UNIT-02)", (_, items) => {
    for (const by of ["from", "to"] as const) {
      expect(
        statusAfter(trade("accepted", items), { type: "cancel", by }),
      ).toBe("already_started");
    }
  });

  test.each([
    ["a token arrived", [objekt("from", true), payment("to")]],
    ["part of one side arrived", sixObjekts().with(0, objekt("from", true))],
    [
      "all of one side arrived",
      [...sixObjekts(true).slice(0, 3), ...sixObjekts().slice(3)],
    ],
    ["all but one arrived", sixObjekts(true).with(5, objekt("to"))],
  ])("a dispute is still possible once %s (LIFE-02, UNIT-04)", (_, items) => {
    for (const by of ["from", "to"] as const) {
      expect(
        statusAfter(trade("accepted", items), { type: "dispute", by }),
      ).toBe("disputed");
    }
  });

  /**
   * Every way a trade can sit outside accepted, with each canceller and
   * abandoned mark, so the page offers no party action in any of them.
   */
  test.each([
    { status: "disputed", items: sixObjekts() },
    { status: "completed", items: sixObjekts(true) },
    { status: "cancelled", cancelledBy: "from", items: sixObjekts() },
    { status: "cancelled", cancelledBy: "to", items: sixObjekts() },
    { status: "cancelled", cancelledBy: "staff", items: sixObjekts() },
    { status: "timed_out", abandonedBy: ["from"], items: sixObjekts() },
    { status: "timed_out", abandonedBy: ["to"], items: sixObjekts() },
    { status: "timed_out", abandonedBy: ["from", "to"], items: sixObjekts() },
  ] satisfies TradeState[])(
    "cancel and dispute are refused when %o (UNIT-03)",
    (state) => {
      for (const type of ["cancel", "dispute"] as const) {
        for (const by of ["from", "to"] as const) {
          expect(statusAfter(state, { type, by })).toBe("wrong_status");
        }
      }
    },
  );
});

describe("partyAction", () => {
  const due = { deadlinePassed: true, arrived: false };
  const open = { deadlinePassed: false, arrived: false };
  const reason = (
    state: TradeState,
    type: "cancel" | "dispute",
    facts: { deadlinePassed: boolean; arrived: boolean },
  ) => {
    const result = partyAction(state, { type, by: "from" }, facts);
    return result.ok ? result.trade.status : result.reason;
  };

  test.each(["cancel", "dispute"] as const)(
    "%s: a trade that moved on is refused before its deadline (UNIT-06)",
    (type) => {
      expect(reason(trade("completed", sixObjekts(true)), type, due)).toBe(
        "wrong_status",
      );
      expect(reason(trade("disputed", sixObjekts()), type, due)).toBe(
        "wrong_status",
      );
    },
  );

  test.each(["cancel", "dispute"] as const)(
    "%s: a due trade is refused before anything else",
    (type) => {
      expect(reason(trade("accepted", sixObjekts()), type, due)).toBe(
        "deadline_passed",
      );
      expect(
        reason(
          trade("accepted", [objekt("from", true), objekt("to")]),
          type,
          due,
        ),
      ).toBe("deadline_passed");
    },
  );

  test("cancel: refused once a token arrived, recorded or not", () => {
    expect(
      reason(
        trade("accepted", [objekt("from", true), objekt("to")]),
        "cancel",
        open,
      ),
    ).toBe("already_started");
    expect(
      reason(trade("accepted", sixObjekts()), "cancel", {
        deadlinePassed: false,
        arrived: true,
      }),
    ).toBe("already_started");
    expect(reason(trade("accepted", sixObjekts()), "cancel", open)).toBe(
      "cancelled",
    );
  });

  test("dispute: an arrival doesn't stop it", () => {
    expect(
      reason(trade("accepted", sixObjekts()), "dispute", {
        deadlinePassed: false,
        arrived: true,
      }),
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

  test("six tokens from both sides complete on the last one, in any order (LIFE-07)", () => {
    for (const order of [
      [0, 1, 2, 3, 4, 5],
      [5, 0, 4, 1, 3, 2],
    ]) {
      let state = trade("accepted", sixObjekts());
      for (const [step, item] of order.entries()) {
        state = apply(state, { type: "transfer", item });
        expect(state.status).toBe(step < 5 ? "accepted" : "completed");
      }
      expect(state.items).toEqual(sixObjekts(true));
    }
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

  test("a disputed trade records all six tokens but stays disputed (LIFE-09)", () => {
    let state = trade("disputed", sixObjekts());
    for (const item of [0, 1, 2, 3, 4, 5]) {
      state = apply(state, { type: "transfer", item });
      expect(state.status).toBe("disputed");
    }
    expect(state.items).toEqual(sixObjekts(true));
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
    ["a negative index", { type: "transfer", item: -1 }],
    ["a negative index past the start", { type: "transfer", item: -3 }],
    ["a fractional index", { type: "transfer", item: 0.5 }],
    ["a negative payment index", { type: "mark_paid", item: -1, by: "to" }],
    [
      "a negative confirmation index",
      { type: "confirm_payment", item: -1, by: "from" },
    ],
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

  test.each([6, -1, -7])(
    "refuses index %d on six tokens without touching any (LIFE-08, LIFE-24)",
    (item) => {
      expect(
        transition(trade("accepted", sixObjekts()), { type: "transfer", item }),
      ).toEqual({ ok: false, reason: "no_such_item" });
    },
  );

  test("refuses a transfer on an ended trade (LIFE-08)", () => {
    for (const status of ["completed", "cancelled", "timed_out"] as const) {
      expect(
        statusAfter(trade(status, sixObjekts()), { type: "transfer", item: 0 }),
      ).toBe("wrong_status");
    }
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

  test("marks the poster when only the poster owes (LIFE-10)", () => {
    const items = [objekt("from", true), objekt("from"), objekt("to", true)];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", abandonedBy: ["from"], items },
    });
  });

  test("marks both sides when each sent only part (LIFE-11)", () => {
    const items = [
      objekt("from", true),
      objekt("from"),
      objekt("to"),
      objekt("to", true),
    ];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", abandonedBy: ["from", "to"], items },
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

  test("completes when only the seller's confirmation is missing (LIFE-12)", () => {
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

describe("transition: staff extend", () => {
  test("unfreezes a disputed trade with items still owed (LIFE-16)", () => {
    const items = [objekt("from", true), objekt("to")];
    expect(
      transition(trade("disputed", items), { type: "staff_extend" }),
    ).toEqual({ ok: true, trade: { status: "accepted", items } });
  });

  test("completes a disputed trade whose items all arrived (LIFE-25)", () => {
    expect(
      transition(trade("disputed", sixObjekts(true)), { type: "staff_extend" }),
    ).toEqual({
      ok: true,
      trade: { status: "completed", items: sixObjekts(true) },
    });
  });
});

describe("owingSides (LIFE-23)", () => {
  test.each([
    ["nobody owes", [objekt("from", true), objekt("to", true)], []],
    ["only the poster owes", [objekt("from"), objekt("to", true)], ["from"]],
    ["only the claimer owes", [objekt("from", true), objekt("to")], ["to"]],
    ["both owe", [objekt("to"), objekt("from")], ["from", "to"]],
    [
      "both sent part",
      [objekt("from", true), objekt("from"), objekt("to"), objekt("to", true)],
      ["from", "to"],
    ],
    [
      "a payment marked paid but unconfirmed counts as paid",
      [objekt("from", true), payment("to", { markedPaid: true })],
      [],
    ],
  ] satisfies [string, TradeItemState[], TradeSide[]][])(
    "%s",
    (_, items, expected) => {
      expect(owingSides(items)).toEqual(expected);
    },
  );
});

describe("needsYou (UNIT-05)", () => {
  const partial = [objekt("from", true), objekt("from"), objekt("to", true)];

  test("an accepted trade needs the sides still owing", () => {
    expect(needsYou(trade("accepted", partial), "from")).toBe(true);
    expect(needsYou(trade("accepted", partial), "to")).toBe(false);
    for (const side of ["from", "to"] as const) {
      expect(needsYou(trade("accepted", sixObjekts()), side)).toBe(true);
      expect(needsYou(trade("accepted", sixObjekts(true)), side)).toBe(false);
    }
  });

  test.each(["disputed", "completed", "cancelled", "timed_out"] as const)(
    "a %s trade never needs anyone",
    (status) => {
      for (const side of ["from", "to"] as const) {
        expect(needsYou(trade(status, sixObjekts()), side)).toBe(false);
      }
    },
  );
});

describe("listingEventAfter", () => {
  const posters = [{ banned: false }, { banned: true }];

  test("a completed trade fills the listing, banned poster or not (LIFE-19)", () => {
    for (const poster of posters) {
      expect(
        listingEventAfter(trade("completed", sixObjekts(true)), poster),
      ).toBe("fill");
    }
  });

  /**
   * Only a release needs the poster's holdings, which the caller reads to
   * reopen or break the listing.
   */
  describe("after a cancel, by any side (LIFE-20)", () => {
    test.each([
      [{ banned: false }, "release"],
      [{ banned: true }, "remove"],
    ] satisfies [{ banned: boolean }, ListingEvent | "release"][])(
      "%o",
      (poster, expected) => {
        for (const cancelledBy of ["from", "to", "staff"] as const) {
          expect(
            listingEventAfter(
              { status: "cancelled", cancelledBy, items: purchase },
              poster,
            ),
          ).toBe(expected);
        }
      },
    );
  });

  /**
   * A banned poster's listing is removed before anything else is checked,
   * even when the poster was marked abandoned.
   */
  describe("after a time out (LIFE-21)", () => {
    test.each([
      [["to"], { banned: false }, "release"],
      [["from"], { banned: false }, "abandon"],
      [["from", "to"], { banned: false }, "abandon"],
      [["to"], { banned: true }, "remove"],
      [["from"], { banned: true }, "remove"],
      [["from", "to"], { banned: true }, "remove"],
    ] satisfies [
      [TradeSide, ...TradeSide[]],
      { banned: boolean },
      ListingEvent | "release",
    ][])("abandoned by %o, poster %o", (abandonedBy, poster, expected) => {
      expect(
        listingEventAfter(
          { status: "timed_out", abandonedBy, items: sixObjekts() },
          poster,
        ),
      ).toBe(expected);
    });
  });

  test("a live or pending trade leaves the listing alone (LIFE-22)", () => {
    for (const status of ["accepted", "disputed", "pending"] as const) {
      for (const poster of posters) {
        expect(listingEventAfter(trade(status, purchase), poster)).toBe(
          undefined,
        );
      }
    }
  });
});

describe("tradeState", () => {
  const unsent = {
    transferredAt: null,
    markedPaidAt: null,
    confirmedAt: null,
  };
  const at = new Date("2026-10-12T12:00:00Z");

  test("reads items in order, by what their timestamps say", () => {
    expect(
      tradeState({ status: "accepted", cancelledBy: null, abandonedBy: null }, [
        { kind: "objekt", sender: "from", ...unsent, transferredAt: at },
        { kind: "objekt", sender: "to", ...unsent },
        { kind: "payment", sender: "to", ...unsent, markedPaidAt: at },
        { kind: "payment", sender: "to", ...unsent, confirmedAt: at },
      ]),
    ).toEqual({
      status: "accepted",
      items: [
        objekt("from", true),
        objekt("to"),
        payment("to", { markedPaid: true }),
        payment("to", { confirmed: true }),
      ],
    });
  });

  test("carries who cancelled or abandoned", () => {
    expect(
      tradeState(
        { status: "cancelled", cancelledBy: "staff", abandonedBy: null },
        [],
      ),
    ).toEqual({ status: "cancelled", cancelledBy: "staff", items: [] });
    expect(
      tradeState(
        { status: "timed_out", cancelledBy: null, abandonedBy: ["from", "to"] },
        [],
      ),
    ).toEqual({ status: "timed_out", abandonedBy: ["from", "to"], items: [] });
  });

  test.each([
    [
      "a listing status",
      { status: "claimed", cancelledBy: null, abandonedBy: null },
    ],
    [
      "a cancel without a side",
      { status: "cancelled", cancelledBy: null, abandonedBy: null },
    ],
    [
      "a time out without a mark",
      { status: "timed_out", cancelledBy: null, abandonedBy: [] },
    ],
  ] satisfies [string, Parameters<typeof tradeState>[0]][])(
    "throws on %s",
    (_, row) => {
      expect(() => tradeState(row, [])).toThrow();
    },
  );
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
  ["remove", ["open", "claimed"], "removed"],
  ["abandon", ["claimed"], "abandoned"],
];

describe("transitionListing: every event from every status (LIFE-18)", () => {
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

describe("listingTransition agrees with transitionListing (LTR-01)", () => {
  for (const [event] of listingAllowed) {
    test.each([...listingStatuses])(`${event} from %s`, (status) => {
      const { from, to } = listingTransition(event);
      const result = transitionListing(status, event);
      expect(from.includes(status)).toBe(result.ok);
      if (result.ok) expect(result.status).toBe(to);
    });
  }

  test("covers every listing event", () => {
    expect(
      listingAllowed.map(([event]) => [event, listingTransition(event)]),
    ).toEqual(listingAllowed.map(([event, from, to]) => [event, { from, to }]));
  });
});
